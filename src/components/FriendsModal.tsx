import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Trash2, 
  Send, 
  Radio, 
  Play, 
  UserCheck, 
  Loader2, 
  Clock, 
  Sparkles,
  ShieldAlert,
  Globe
} from 'lucide-react';
import { auth } from '../firebase';
import { 
  searchUsers, 
  sendFriendRequest, 
  acceptFriendRequest, 
  rejectFriendRequest, 
  removeFriend, 
  subscribeToFriends, 
  subscribeToIncomingRequests, 
  subscribeToOutgoingRequests,
  sendWorldInvite,
  fetchUserProfile,
  FriendshipData, 
  FriendRequestData, 
  UserProfileData 
} from '../firebase';
import { sound } from '../audio';
import { onlineManager } from '../onlineSystem';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom?: (roomCode: string) => void;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose, onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  
  // Data States
  const [friends, setFriends] = useState<FriendshipData[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Record<string, UserProfileData>>({});
  const [incomingReqs, setIncomingReqs] = useState<FriendRequestData[]>([]);
  const [outgoingReqs, setOutgoingReqs] = useState<FriendRequestData[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<UserProfileData[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  
  // Status feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  // Real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    const unsubFriends = subscribeToFriends(currentUser.uid, async (fetchedFriends) => {
      setFriends(fetchedFriends);
      
      // Fetch latest profile statuses for friends
      const profilesMap: Record<string, UserProfileData> = {};
      for (const f of fetchedFriends) {
        const otherUid = f.users.find(u => u !== currentUser.uid);
        if (otherUid) {
          const prof = await fetchUserProfile(otherUid);
          if (prof) profilesMap[otherUid] = prof;
        }
      }
      setFriendProfiles(profilesMap);
    });

    const unsubIncoming = subscribeToIncomingRequests(currentUser.uid, (reqs) => {
      setIncomingReqs(reqs);
    });

    const unsubOutgoing = subscribeToOutgoingRequests(currentUser.uid, (reqs) => {
      setOutgoingReqs(reqs);
    });

    return () => {
      unsubFriends();
      unsubIncoming();
      unsubOutgoing();
    };
  }, [currentUser]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    sound.playButtonPress();
    setSearching(true);
    const results = await searchUsers(searchQuery);
    // Filter out current user
    setSearchResults(results.filter(u => u.uid !== currentUser?.uid));
    setSearching(false);
  };

  const handleSendRequest = async (targetUser: UserProfileData) => {
    if (!currentUser) return;
    sound.playButtonPress();
    try {
      const senderName = currentUser.displayName || 'Пилот';
      await sendFriendRequest(currentUser.uid, senderName, targetUser.uid, targetUser.displayName || targetUser.nickname || 'Пилот');
      showNotification(`Запрос отправлен игроку ${targetUser.displayName || targetUser.nickname}`);
    } catch (err: any) {
      alert(`Ошибка отправки запроса: ${err.message || err}`);
    }
  };

  const handleAcceptRequest = async (req: FriendRequestData) => {
    if (!currentUser) return;
    sound.playButtonPress();
    try {
      const currentProf = await fetchUserProfile(currentUser.uid);
      await acceptFriendRequest(req, currentProf);
      showNotification(`Запрос принят! ${req.senderName} теперь в вашем списке друзей.`);
    } catch (err: any) {
      alert(`Ошибка принятия запроса: ${err.message || err}`);
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    sound.playButtonPress();
    try {
      await rejectFriendRequest(reqId);
      showNotification('Запрос отклонен.');
    } catch (err: any) {
      alert(`Ошибка: ${err.message || err}`);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendName: string) => {
    if (!confirm(`Удалить ${friendName} из списка друзей?`)) return;
    sound.playButtonPress();
    try {
      await removeFriend(friendshipId);
      showNotification(`${friendName} удален из друзей.`);
    } catch (err: any) {
      alert(`Ошибка: ${err.message || err}`);
    }
  };

  const handleInviteToWorld = async (friendUid: string, friendName: string) => {
    if (!currentUser) return;
    sound.playButtonPress();
    const currentRoom = onlineManager.roomCode;
    if (!currentRoom) {
      alert('Вы не находитесь в онлайн-комнате. Сначала создайте или войдите на сервер!');
      return;
    }

    try {
      const senderName = currentUser.displayName || 'Друг';
      await sendWorldInvite(
        currentUser.uid,
        senderName,
        friendUid,
        currentRoom,
        `Мир ${senderName}`
      );
      showNotification(`Приглашение в мир [${currentRoom}] отправлено ${friendName}!`);
    } catch (err: any) {
      alert(`Ошибка отправки приглашения: ${err.message || err}`);
    }
  };

  const handleJoinFriendWorld = (roomCode: string) => {
    sound.playButtonPress();
    if (onJoinRoom) {
      onJoinRoom(roomCode);
    } else {
      onlineManager.joinOrCreateRoom(roomCode, onlineManager.localPlayerName, false);
    }
    onClose();
  };

  // Helper check if user is already a friend or request is pending
  const isFriend = (uid: string) => friends.some(f => f.users.includes(uid));
  const isOutgoingPending = (uid: string) => outgoingReqs.some(r => r.receiverUid === uid);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white uppercase">
                  Друзья & Онлайн Сообщество
                </h2>
                {incomingReqs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                    +{incomingReqs.length} Запроса
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Поиск игроков, статус онлайн, принятие заявок и приглашения в свой мир
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

        {/* Notification Toast */}
        {actionSuccess && (
          <div className="px-6 py-2.5 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 pt-4 bg-slate-950/40">
          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => { sound.playButtonPress(); setActiveTab('friends'); }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'friends' 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" /> Друзья ({friends.length})
            </button>

            <button
              onClick={() => { sound.playButtonPress(); setActiveTab('search'); }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'search' 
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Search className="w-4 h-4" /> Поиск Игроков
            </button>

            <button
              onClick={() => { sound.playButtonPress(); setActiveTab('requests'); }}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
                activeTab === 'requests' 
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <UserPlus className="w-4 h-4" /> Запросы ({incomingReqs.length})
              {incomingReqs.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-2" />
              )}
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-200 text-sm min-h-[300px]">
          
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {friends.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6 text-xs text-slate-500 italic space-y-3">
                  <Users className="w-10 h-10 mx-auto text-slate-600" />
                  <div>У вас пока нет друзей в списке. Воспользуйтесь вкладкой <strong>Поиск Игроков</strong>!</div>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 bg-sky-600/20 border border-sky-500/40 text-sky-300 font-bold rounded-xl text-xs hover:bg-sky-600/30 transition-colors cursor-pointer"
                  >
                    + Найти пилотов
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                  {friends.map((friendship) => {
                    const otherUid = friendship.users.find(u => u !== currentUser?.uid) || '';
                    const friendProf = friendProfiles[otherUid];
                    const displayName = friendProf?.displayName || friendProf?.nickname || (friendship.user1.uid === otherUid ? friendship.user1.name : friendship.user2.name);
                    const avatarUrl = friendProf?.avatarUrl || '';
                    
                    // Status logic
                    const status = friendProf?.status || 'offline';
                    const isOnline = status === 'online' || status === 'in_game';
                    const isInGame = status === 'in_game' && friendProf?.currentRoomCode;

                    return (
                      <div key={friendship.id} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                        
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-10 h-10 rounded-xl object-cover border border-slate-700" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-extrabold text-base">
                                {displayName[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                              isInGame ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : isOnline ? 'bg-emerald-400' : 'bg-slate-600'
                            }`} />
                          </div>

                          <div>
                            <div className="font-extrabold text-white text-sm flex items-center gap-2">
                              <span>{displayName}</span>
                            </div>

                            <div className="text-[11px] flex items-center gap-2 mt-0.5">
                              {isInGame ? (
                                <span className="text-sky-400 font-bold flex items-center gap-1 font-mono">
                                  <Radio className="w-3 h-3 animate-pulse text-sky-400" /> В игре: {friendProf.currentRoomCode}
                                </span>
                              ) : isOnline ? (
                                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> В сети
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Офлайн
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Friend Action Controls */}
                        <div className="flex items-center gap-2">
                          {/* If Friend is in Game, allow direct Join */}
                          {isInGame && (
                            <button
                              onClick={() => handleJoinFriendWorld(friendProf.currentRoomCode!)}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1"
                              title="Присоединиться к миру друга"
                            >
                              <Play className="w-3.5 h-3.5 fill-white" /> Присоединиться
                            </button>
                          )}

                          {/* Invite to my world */}
                          {onlineManager.status === 'connected' && (
                            <button
                              onClick={() => handleInviteToWorld(otherUid, displayName)}
                              className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                              title="Пригласить друга в мой текущий сервер"
                            >
                              <Send className="w-3.5 h-3.5" /> Пригласить
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveFriend(friendship.id!, displayName)}
                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                            title="Удалить из друзей"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SEARCH PLAYERS */}
          {activeTab === 'search' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Введите позывной или имя игрока..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Найти
                </button>
              </form>

              {searchResults.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {searchResults.map((user) => {
                    const alreadyFriend = isFriend(user.uid);
                    const pendingOut = isOutgoingPending(user.uid);

                    return (
                      <div key={user.uid} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 font-extrabold flex items-center justify-center text-sm border border-sky-500/30">
                            {(user.displayName || user.nickname || 'P')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{user.displayName || user.nickname}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Позывной: {user.nickname || '—'}
                            </div>
                          </div>
                        </div>

                        <div>
                          {alreadyFriend ? (
                            <span className="px-3 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" /> В друзьях
                            </span>
                          ) : pendingOut ? (
                            <span className="px-3 py-1.5 bg-amber-950/40 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Отправлено
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(user)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Добавить
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                searchQuery && !searching && (
                  <div className="text-center py-8 text-xs text-slate-500 italic">
                    Игроков по запросу "{searchQuery}" не найдено.
                  </div>
                )
              )}
            </div>
          )}

          {/* TAB 3: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-amber-400" /> Входящие запросы ({incomingReqs.length})
                </h3>

                {incomingReqs.length === 0 ? (
                  <div className="text-center py-6 bg-slate-950/30 border border-slate-800 rounded-xl text-xs text-slate-500 italic">
                    Новых входящих запросов нет
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomingReqs.map((req) => (
                      <div key={req.id} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-sm border border-amber-500/30">
                            {req.senderName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs">{req.senderName}</div>
                            <div className="text-[10px] text-slate-400">Хочет добавить вас в друзья</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Принять
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id!)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outgoing Requests section */}
              {outgoingReqs.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-400" /> Исходящие запросы ({outgoingReqs.length})
                  </h3>
                  <div className="space-y-2">
                    {outgoingReqs.map((req) => (
                      <div key={req.id} className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                        <span className="text-slate-300 font-semibold">{req.receiverName}</span>
                        <span className="text-amber-400 font-mono text-[11px]">Ожидает подтверждения</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-indigo-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Firestore Friends System</span>
          </span>
          <button
            onClick={() => {
              sound.playButtonPress();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

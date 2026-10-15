import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Check, X, Trash2, Send, Radio, Play, UserCheck, Loader2, Clock } from 'lucide-react';
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
import { ModalShell, Tabs, Avatar } from './gameUi';

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
    <ModalShell
      id="friends-modal"
      title="Друзья"
      subtitle="Поиск игроков, заявки и приглашения в свой мир"
      width={820}
      tall
      onClose={() => { sound.playButtonPress(); onClose(); }}
      wipeKey={activeTab}
      bodyKey={activeTab}
      tabs={
        <Tabs
          value={activeTab}
          onChange={t => { sound.playButtonPress(); setActiveTab(t); }}
          items={[
            { id: 'friends', label: 'Друзья', icon: <Users width={18} height={18} />, badge: friends.length || undefined },
            { id: 'search', label: 'Поиск', icon: <Search width={18} height={18} /> },
            { id: 'requests', label: 'Заявки', icon: <UserPlus width={18} height={18} />, badge: incomingReqs.length || undefined }
          ]}
        />
      }
      footerHints={[['Esc', 'Закрыть']]}
    >
      <div className="gu-stagger">
        {actionSuccess && (
          <div className="gu-note gu-ok gu-row2"><Check width={18} height={18} /><span>{actionSuccess}</span></div>
        )}

        {!currentUser && (
          <div className="gu-panel gu-empty">
            <div className="gu-cn" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Нужен вход в аккаунт</div>
            <div style={{ fontSize: 14 }}>Войдите в аккаунт, чтобы пользоваться списком друзей.</div>
          </div>
        )}

        {/* ======================= FRIENDS ======================= */}
        {currentUser && activeTab === 'friends' && (
          friends.length === 0 ? (
            <div className="gu-panel gu-empty">
              <Users width={36} height={36} color="#8f8b81" />
              <div className="gu-cn" style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Список друзей пуст</div>
              <div style={{ fontSize: 14, maxWidth: 360 }}>Найдите игроков по позывному и отправьте им заявку.</div>
              <button type="button" className="gu-btn gu-btn-p" onClick={() => setActiveTab('search')}>
                <Search width={18} height={18} />Найти игроков
              </button>
            </div>
          ) : (
            <div className="gu-list">
              {friends.map(friendship => {
                const otherUid = friendship.users.find(u => u !== currentUser?.uid) || '';
                const friendProf = friendProfiles[otherUid];
                const displayName = friendProf?.displayName || friendProf?.nickname || (friendship.user1.uid === otherUid ? friendship.user1.name : friendship.user2.name);
                const avatarUrl = friendProf?.avatarUrl || '';
                const status = friendProf?.status || 'offline';
                const isOnline = status === 'online' || status === 'in_game';
                const isInGame = status === 'in_game' && friendProf?.currentRoomCode;

                return (
                  <div key={friendship.id} className="gu-rw">
                    <Avatar name={displayName} url={avatarUrl} status={isInGame ? 'game' : isOnline ? 'online' : 'off'} />
                    <div className="gu-grow">
                      <div className="gu-rw-t">{displayName}</div>
                      <div className="gu-rw-d" style={{ color: isInGame ? '#e0ab45' : isOnline ? '#9ac985' : undefined }}>
                        {isInGame ? (
                          <span className="gu-row2" style={{ gap: 6 }}><Radio width={13} height={13} />В игре: {friendProf.currentRoomCode}</span>
                        ) : isOnline ? 'В сети' : 'Не в сети'}
                      </div>
                    </div>
                    <div className="gu-rw-end">
                      {isInGame && (
                        <button type="button" className="gu-btn gu-btn-p gu-btn-sm" onClick={() => handleJoinFriendWorld(friendProf.currentRoomCode!)} title="Присоединиться к миру друга">
                          <Play width={14} height={14} fill="#1a1409" />Присоединиться
                        </button>
                      )}
                      {onlineManager.status === 'connected' && (
                        <button type="button" className="gu-btn gu-btn-s gu-btn-sm" onClick={() => handleInviteToWorld(otherUid, displayName)} title="Пригласить в мой сервер">
                          <Send width={14} height={14} />Пригласить
                        </button>
                      )}
                      <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => handleRemoveFriend(friendship.id!, displayName)} title="Удалить из друзей" aria-label="Удалить из друзей">
                        <Trash2 width={16} height={16} color="#d9745a" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ======================= SEARCH ======================= */}
        {currentUser && activeTab === 'search' && (
          <>
            <form onSubmit={handleSearchSubmit} className="gu-row2">
              <label className="gu-search gu-grow" style={{ height: 48 }}>
                <Search width={18} height={18} color="#a29e93" />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Позывной или имя игрока" />
              </label>
              <button type="submit" className="gu-btn gu-btn-p" disabled={searching}>
                {searching ? <Loader2 width={18} height={18} className="gu-spin" /> : <Search width={18} height={18} />}Найти
              </button>
            </form>

            {searchResults.length > 0 ? (
              <div className="gu-list">
                {searchResults.map(user => {
                  const alreadyFriend = isFriend(user.uid);
                  const pendingOut = isOutgoingPending(user.uid);
                  const name = user.displayName || user.nickname || 'Игрок';
                  return (
                    <div key={user.uid} className="gu-rw">
                      <Avatar name={name} url={user.avatarUrl} />
                      <div className="gu-grow">
                        <div className="gu-rw-t">{name}</div>
                        <div className="gu-rw-d">Позывной: {user.nickname || '-'}</div>
                      </div>
                      <div className="gu-rw-end">
                        {alreadyFriend ? (
                          <span className="gu-pill on"><UserCheck width={15} height={15} />В друзьях</span>
                        ) : pendingOut ? (
                          <span className="gu-pill"><Clock width={15} height={15} />Отправлено</span>
                        ) : (
                          <button type="button" className="gu-btn gu-btn-p gu-btn-sm" onClick={() => handleSendRequest(user)}>
                            <UserPlus width={15} height={15} />Добавить
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              searchQuery && !searching && (
                <div className="gu-panel gu-empty" style={{ padding: 28 }}>Игроков по запросу «{searchQuery}» не найдено.</div>
              )
            )}
          </>
        )}

        {/* ======================= REQUESTS ======================= */}
        {currentUser && activeTab === 'requests' && (
          <>
            <div>
              <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                <span className="gu-grp">Входящие</span>
                <span className="gu-mut" style={{ fontSize: 13 }}>{incomingReqs.length}</span>
              </div>
              {incomingReqs.length === 0 ? (
                <div className="gu-panel gu-empty" style={{ padding: 28 }}>Новых заявок нет</div>
              ) : (
                <div className="gu-list">
                  {incomingReqs.map(req => (
                    <div key={req.id} className="gu-rw">
                      <Avatar name={req.senderName} />
                      <div className="gu-grow">
                        <div className="gu-rw-t">{req.senderName}</div>
                        <div className="gu-rw-d">Хочет добавить вас в друзья</div>
                      </div>
                      <div className="gu-rw-end">
                        <button type="button" className="gu-btn gu-btn-p gu-btn-sm" onClick={() => handleAcceptRequest(req)}>
                          <Check width={15} height={15} />Принять
                        </button>
                        <button type="button" className="gu-btn gu-btn-s gu-btn-sm gu-btn-sq" onClick={() => handleRejectRequest(req.id!)} title="Отклонить" aria-label="Отклонить">
                          <X width={16} height={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {outgoingReqs.length > 0 && (
              <div>
                <div className="gu-row2" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="gu-grp">Исходящие</span>
                  <span className="gu-mut" style={{ fontSize: 13 }}>{outgoingReqs.length}</span>
                </div>
                <div className="gu-list">
                  {outgoingReqs.map(req => (
                    <div key={req.id} className="gu-rw" style={{ minHeight: 52 }}>
                      <div className="gu-grow gu-rw-t">{req.receiverName}</div>
                      <div className="gu-rw-end gu-mut" style={{ fontSize: 13 }}>Ожидает подтверждения</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  );
};

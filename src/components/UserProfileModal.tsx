import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  LogOut,
  Globe,
  Upload,
  Download,
  Save,
  Check,
  Loader2,
  Coins,
  Heart,
  Package,
  AlertCircle,
  Copy,
  ExternalLink,
  Edit3,
  HardDrive
} from 'lucide-react';
import type { User } from 'firebase/auth';
import { 
  auth, 
  loginWithGoogle, 
  loginAnonymously, 
  logoutUser, 
  fetchUserProfile, 
  updateUserProfile, 
  UserProfileData, 
  savePlayerDataToCloud, 
  loadPlayerDataFromCloud, 
  PlayerCloudSave 
} from '../firebase';
import { sound } from '../audio';
import { ModalShell, Tabs, Avatar } from './gameUi';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  currentPlayerData?: {
    money: number;
    health: number;
    position: { x: number; y: number };
    inventory: any[];
    needs?: any;
  };
  onLoadCloudSaveData?: (saveData: PlayerCloudSave) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentPlayerData,
  onLoadCloudSaveData
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'cloud_saves'>('profile');
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [authError, setAuthError] = useState<{ message: string; domain?: string } | null>(null);

  // Profile Form States
  const [displayName, setDisplayName] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  
  // Cloud Save State
  const [cloudSave, setCloudSave] = useState<PlayerCloudSave | null>(null);
  const [loadingSave, setLoadingSave] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      loadProfile(currentUser.uid);
      setAuthError(null);
    } else {
      setProfile(null);
    }
  }, [currentUser]);

  const loadProfile = async (uid: string) => {
    setLoading(true);
    const data = await fetchUserProfile(uid);
    if (data) {
      setProfile(data);
      setDisplayName(data.displayName || '');
      setNickname(data.nickname || '');
      setAvatarUrl(data.avatarUrl || '');
      setBio(data.bio || '');
    }
    setLoading(false);
  };

  const handleFetchCloudSave = async () => {
    if (!currentUser) return;
    setLoadingSave(true);
    const save = await loadPlayerDataFromCloud(currentUser.uid);
    setCloudSave(save);
    setLoadingSave(false);
  };

  if (!isOpen) return null;

  const handleLoginGoogle = async () => {
    sound.playButtonPress();
    setLoading(true);
    setAuthError(null);
    try {
      await loginWithGoogle();
      setSaveSuccess('Успешный вход через Google!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const isUnauthDomain = err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain') || err?.unauthorizedDomain;
      setAuthError({
        message: err.message || 'Ошибка авторизации Google',
        domain: isUnauthDomain ? (err.unauthorizedDomain || host) : undefined
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAnon = async () => {
    sound.playButtonPress();
    setLoading(true);
    setAuthError(null);
    try {
      await loginAnonymously();
      setSaveSuccess('Гостевой вход выполнен!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setAuthError({
        message: err.message || 'Ошибка локального входа'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    sound.playButtonPress();
    await logoutUser();
    setProfile(null);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    sound.playButtonPress();
    setSaving(true);

    try {
      await updateUserProfile(currentUser.uid, {
        displayName: displayName.trim() || 'Пилот',
        nickname: nickname.trim() || 'Пилот',
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim()
      });

      setSaveSuccess('Профиль успешно сохранен!');
      setTimeout(() => setSaveSuccess(null), 3000);
      await loadProfile(currentUser.uid);
    } catch (err: any) {
      alert(`Ошибка сохранения: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProgressToCloud = async () => {
    if (!currentUser || !currentPlayerData) return;
    sound.playButtonPress();
    setSaving(true);
    try {
      await savePlayerDataToCloud(currentUser.uid, {
        money: currentPlayerData.money,
        health: currentPlayerData.health,
        position: currentPlayerData.position,
        inventory: currentPlayerData.inventory,
        needs: currentPlayerData.needs || {},
        version: '1.4'
      });
      setSaveSuccess('Игровой прогресс сохранен в облако Firestore!');
      setTimeout(() => setSaveSuccess(null), 3000);
      await handleFetchCloudSave();
    } catch (err: any) {
      alert(`Не удалось сохранить прогресс: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCloudSave = () => {
    if (!cloudSave || !onLoadCloudSaveData) return;
    sound.playButtonPress();
    onLoadCloudSaveData(cloudSave);
    setSaveSuccess('Прогресс успешно загружен из облака!');
    setTimeout(() => setSaveSuccess(null), 3000);
  };

  const shownName = displayName || nickname || 'Пилот';

  return (
    <ModalShell
      id="profile-modal"
      title="Аккаунт"
      subtitle="Профиль водителя и облачные сохранения"
      width={900}
      tall={!!currentUser}
      onClose={() => { sound.playButtonPress(); onClose(); }}
      wipeKey={activeTab}
      bodyKey={currentUser ? activeTab : 'guest'}
      tabs={
        currentUser ? (
          <Tabs
            value={activeTab}
            onChange={t => {
              sound.playButtonPress();
              setActiveTab(t);
              if (t === 'cloud_saves') handleFetchCloudSave();
            }}
            items={[
              { id: 'profile', label: 'Профиль', icon: <Edit3 width={18} height={18} /> },
              { id: 'cloud_saves', label: 'Облачный сейв', icon: <HardDrive width={18} height={18} /> }
            ]}
          />
        ) : undefined
      }
      footerHints={[['Esc', 'Закрыть']]}
      footerRight={
        <span className="gu-row2 gu-mut" style={{ fontSize: 13, gap: 8 }}>
          <span className="gu-dot gu-on" />Firestore подключён
        </span>
      }
    >
      <div className="gu-stagger">
        {saveSuccess && (
          <div className="gu-note gu-ok gu-row2"><Check width={18} height={18} /><span>{saveSuccess}</span></div>
        )}

        {/* identity */}
        <div className="gu-panel gu-pad gu-row2 gu-wrap" style={{ gap: 22, padding: '24px 26px' }}>
          <Avatar size="lg" name={shownName} url={currentUser ? avatarUrl : undefined} />
          <div className="gu-grow">
            {currentUser ? (
              <>
                <div className="gu-cn" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.05, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shownName}</div>
                <div className="gu-mut" style={{ marginTop: 6, fontSize: 14 }}>
                  {currentUser.isAnonymous ? 'Гостевой вход' : 'Google'} · {currentUser.email || 'без e-mail'}
                </div>
                <div className="gu-mut" style={{ marginTop: 2, fontSize: 12 }}>UID {currentUser.uid.slice(0, 10)}</div>
              </>
            ) : (
              <>
                <div className="gu-cn" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.05, color: '#fff' }}>Вы не вошли</div>
                <div className="gu-mut" style={{ marginTop: 8, fontSize: 14, maxWidth: 420 }}>
                  Войдите через Google, чтобы сохранять прогресс в облаке и добавлять друзей, или продолжите с локальным профилем.
                </div>
              </>
            )}
          </div>
          {currentUser ? (
            <button type="button" className="gu-btn gu-btn-s" onClick={handleLogout}><LogOut width={18} height={18} />Выйти</button>
          ) : (
            <div className="gu-row2 gu-wrap">
              <button type="button" className="gu-btn gu-btn-p" onClick={handleLoginGoogle} disabled={loading}>
                {loading ? <Loader2 width={18} height={18} className="gu-spin" /> : <Globe width={18} height={18} />}Войти через Google
              </button>
              <button type="button" className="gu-btn gu-btn-s" onClick={handleLoginAnon} disabled={loading}>
                <UserIcon width={18} height={18} />Локальный профиль
              </button>
            </div>
          )}
        </div>

        {authError && (
          <div className="gu-note gu-warn" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="gu-row2" style={{ alignItems: 'flex-start' }}>
              <AlertCircle width={18} height={18} style={{ flex: 'none', marginTop: 2 }} />
              <div className="gu-grow">{authError.message}</div>
            </div>
            {authError.domain && (
              <div className="gu-row2 gu-wrap" style={{ justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
                <div>
                  <div className="gu-lbl" style={{ marginBottom: 6 }}>Домен для авторизации в Firebase</div>
                  <span className="gu-code">{authError.domain}</span>
                </div>
                <div className="gu-row2">
                  <button
                    type="button"
                    className="gu-btn gu-btn-s gu-btn-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(authError.domain || '');
                      setSaveSuccess('Домен скопирован в буфер обмена');
                      setTimeout(() => setSaveSuccess(null), 3000);
                    }}
                  >
                    <Copy width={15} height={15} />Копировать
                  </button>
                  <a
                    className="gu-btn gu-btn-p gu-btn-sm"
                    href="https://console.firebase.google.com/project/gen-lang-client-0888101069/authentication/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: 'none' }}
                  >
                    <ExternalLink width={15} height={15} />Открыть консоль
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= PROFILE ======================= */}
        {currentUser && activeTab === 'profile' && (
          <>
            <div className="gu-panel gu-pad">
              <div className="gu-grp" style={{ marginBottom: 14 }}>Статистика</div>
              {profile?.stats ? (
                <div className="gu-grid gu-g3">
                  <div className="gu-stat"><span className="gu-lbl" style={{ margin: 0 }}>Сессий</span><span className="gu-num">{profile.stats.gamesPlayed || 0}</span></div>
                  <div className="gu-stat"><span className="gu-lbl" style={{ margin: 0 }}>Пройдено, км</span><span className="gu-num">{(profile.stats.distanceDriven || 0).toFixed(1)}</span></div>
                  <div className="gu-stat"><span className="gu-lbl" style={{ margin: 0 }}>Доход</span><span className="gu-num">${profile.stats.moneyEarned || 0}</span></div>
                </div>
              ) : (
                <div className="gu-mut" style={{ fontSize: 14 }}>Статистика пока пуста. Совершите первые заезды.</div>
              )}
            </div>

            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="gu-grp">Данные водителя</div>
              <div className="gu-grid gu-g2" style={{ gap: 16 }}>
                <div>
                  <div className="gu-lbl">Отображаемое имя</div>
                  <input type="text" className="gu-inp" value={displayName} onChange={e => setDisplayName(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Например: Александр" />
                </div>
                <div>
                  <div className="gu-lbl">Игровой позывной</div>
                  <input type="text" className="gu-inp" value={nickname} onChange={e => setNickname(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Например: DriftKing_99" />
                </div>
              </div>
              <div>
                <div className="gu-lbl">Ссылка на аватар (квадратное изображение)</div>
                <input type="url" className="gu-inp gu-mono" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="https://..." />
              </div>
              <div>
                <div className="gu-lbl">О себе (видно другим игрокам)</div>
                <textarea className="gu-inp" rows={3} value={bio} onChange={e => setBio(e.target.value)} onKeyDown={e => e.stopPropagation()} placeholder="Опишите свой стиль вождения" />
              </div>
              <div>
                <button type="button" className="gu-btn gu-btn-p" onClick={handleSaveProfile} disabled={saving}>
                  {saving ? <Loader2 width={18} height={18} className="gu-spin" /> : <Save width={18} height={18} />}Сохранить профиль
                </button>
              </div>
            </div>
          </>
        )}

        {/* ======================= CLOUD SAVES ======================= */}
        {currentUser && activeTab === 'cloud_saves' && (
          <div className="gu-grid gu-g2" style={{ alignItems: 'stretch' }}>
            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="gu-row2"><Upload width={18} height={18} color="#e0ab45" /><span className="gu-grp">Записать состояние</span></div>
              <div className="gu-mut" style={{ fontSize: 14, lineHeight: 1.45 }}>Позиция, баланс, инвентарь и здоровье сохраняются в облачный аккаунт.</div>
              {currentPlayerData && (
                <div className="gu-stat" style={{ gap: 8, fontSize: 14 }}>
                  <div className="gu-row2" style={{ gap: 10 }}><Coins width={16} height={16} color="#e0ab45" />Баланс: ${currentPlayerData.money}</div>
                  <div className="gu-row2" style={{ gap: 10 }}><Heart width={16} height={16} color="#e0ab45" />Здоровье: {Math.round(currentPlayerData.health)}%</div>
                  <div className="gu-row2" style={{ gap: 10 }}><Package width={16} height={16} color="#e0ab45" />Предметов: {currentPlayerData.inventory?.length || 0}</div>
                </div>
              )}
              <div style={{ marginTop: 'auto' }}>
                <button type="button" className="gu-btn gu-btn-p gu-btn-block" onClick={handleSaveProgressToCloud} disabled={saving || !currentPlayerData}>
                  {saving ? <Loader2 width={18} height={18} className="gu-spin" /> : <Upload width={18} height={18} />}Записать в облако
                </button>
              </div>
            </div>

            <div className="gu-panel gu-pad" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="gu-row2"><Download width={18} height={18} color="#e0ab45" /><span className="gu-grp">Загрузить состояние</span></div>
              <div className="gu-mut" style={{ fontSize: 14, lineHeight: 1.45 }}>Активирует ранее сохранённую сессию из вашего облачного аккаунта.</div>
              {loadingSave ? (
                <div className="gu-stat gu-row2" style={{ justifyContent: 'center', flexDirection: 'row' }}><Loader2 width={18} height={18} className="gu-spin" />Чтение облака</div>
              ) : cloudSave ? (
                <div className="gu-stat" style={{ gap: 8, fontSize: 14 }}>
                  <div className="gu-row2" style={{ gap: 10, color: '#9ac985', fontWeight: 600 }}><Check width={16} height={16} />Сохранение найдено</div>
                  <div className="gu-row2" style={{ gap: 10 }}><Coins width={16} height={16} color="#e0ab45" />Деньги: ${cloudSave.money}</div>
                  <div className="gu-row2" style={{ gap: 10 }}><Heart width={16} height={16} color="#e0ab45" />Здоровье: {Math.round(cloudSave.health)}%</div>
                  <div className="gu-mut" style={{ fontSize: 12 }}>Координаты: {Math.round(cloudSave.position.x)}, {Math.round(cloudSave.position.y)}</div>
                </div>
              ) : (
                <div className="gu-stat gu-mut" style={{ fontSize: 14 }}>Облачных сохранений пока нет.</div>
              )}
              <div style={{ marginTop: 'auto' }}>
                <button type="button" className="gu-btn gu-btn-s gu-btn-block" onClick={handleApplyCloudSave} disabled={!cloudSave}>
                  <Download width={18} height={18} />Применить сохранение
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

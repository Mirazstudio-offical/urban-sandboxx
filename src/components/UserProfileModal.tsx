import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  LogOut, 
  Globe, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Upload, 
  ShieldCheck, 
  X, 
  Edit3, 
  Tag, 
  Activity, 
  HardDrive, 
  Check, 
  Loader2,
  Key,
  Flame,
  Award,
  Coins,
  Heart,
  Package
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
    try {
      await loginWithGoogle();
      setSaveSuccess('Успешный вход через Google!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(`Ошибка входа: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginAnon = async () => {
    sound.playButtonPress();
    setLoading(true);
    try {
      await loginAnonymously();
      setSaveSuccess('Гостевой вход выполнен!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      alert(`Ошибка входа: ${err.message || err}`);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none">
      
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <UserIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide text-white uppercase">
                  Профиль & Облачная БД
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                  Firebase Auth & Firestore
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Настройка данных игрока, кастомных тегов метаданных и синхронизация прогресса
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

        {/* Success Alert Banner */}
        {saveSuccess && (
          <div className="px-6 py-2.5 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-200 text-sm">
          
          {/* Auth Status Bar (Bento Cell 1) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover border border-slate-700" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-sky-500/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-lg">
                      {(displayName || nickname || 'P')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" title="В сети" />
                </div>
                <div>
                  <div className="font-extrabold text-white text-base flex items-center gap-2">
                    <span>{displayName || nickname || 'Пилот'}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-800 border border-slate-700 rounded-full text-slate-300 font-bold font-mono">
                      {currentUser.isAnonymous ? 'Гость' : 'Google Auth'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    UID: {currentUser.uid.slice(0, 10)}... | {currentUser.email || 'Без e-mail'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Авторизация не выполнена. Войдите через Google или как гость для доступа к облаку.</span>
              </div>
            )}

            {currentUser ? (
              <button
                onClick={handleLogout}
                className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Выйти
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleLoginGoogle}
                  disabled={loading}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
                >
                  <Globe className="w-4 h-4" /> Google Вход
                </button>
                <button
                  onClick={handleLoginAnon}
                  disabled={loading}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" /> Гость
                </button>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          {currentUser && (
            <>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => { sound.playButtonPress(); setActiveTab('profile'); }}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'profile' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4" /> Профиль
                </button>

                <button
                  onClick={() => { 
                    sound.playButtonPress(); 
                    setActiveTab('cloud_saves'); 
                    handleFetchCloudSave();
                  }}
                  className={`py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'cloud_saves' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <HardDrive className="w-4 h-4" /> Облачный Сейв
                </button>
              </div>

              {/* TAB 1: PROFILE EDIT (Bento Grid) */}
              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  
                  {/* Card A: Game Statistics (Bento Cell) */}
                  <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[160px]">
                    <div>
                      <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                        <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> Игровая статистика
                      </div>
                      {profile?.stats ? (
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Сессий</div>
                            <div className="font-extrabold text-white mt-1 text-sm">{profile.stats.gamesPlayed || 0}</div>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Пройдено</div>
                            <div className="font-extrabold text-emerald-400 mt-1 text-sm">{(profile.stats.distanceDriven || 0).toFixed(1)} км</div>
                          </div>
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <div className="text-[9px] font-bold text-slate-500 uppercase">Доход</div>
                            <div className="font-extrabold text-amber-400 mt-1 text-sm">${profile.stats.moneyEarned || 0}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic py-4 text-center">
                          Статистика пуста. Совершите свои первые заезды!
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-3 border-t border-slate-800/60 pt-2 font-medium">
                      Данные хранятся в облачной коллекции <code className="text-emerald-400 font-mono font-bold">user_profiles</code>.
                    </div>
                  </div>

                  {/* Card B: Profile Names (Bento Cell) */}
                  <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 flex flex-col gap-3 justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                        <Edit3 className="w-4 h-4 text-sky-400" /> Идентификация водителя
                      </div>
                      <div className="grid grid-cols-1 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Отображаемое имя</label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Например: Александр"
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Игровой позывной (Nickname)</label>
                          <input
                            type="text"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="Например: DriftKing_99"
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card C: Avatar Personalization (Bento Cell) */}
                  <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[140px]">
                    <div>
                      <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-400" /> Аватар
                      </div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">URL адрес изображения</label>
                      <input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 italic font-medium leading-normal mt-2 block">
                      Рекомендуется вставлять ссылку на квадратный аватар.
                    </span>
                  </div>

                  {/* Card D: Bio & Biography (Bento Cell) */}
                  <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between min-h-[140px]">
                    <div>
                      <div className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Award className="w-4 h-4 text-purple-400" /> Биография / Личный статус
                      </div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Параграф о себе</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={2}
                        placeholder="Опишите ваши успехи или повадки за рулем..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-white text-xs font-medium focus:outline-none focus:border-emerald-500 resize-none transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium leading-normal mt-2 block">
                      Информация доступна другим пользователям в списке комнат.
                    </span>
                  </div>

                  {/* Centered Save Action Button */}
                  <div className="md:col-span-2 pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Сохранить изменения профиля
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 3: CLOUD SAVES (Bento Grid) */}
              {activeTab === 'cloud_saves' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
                  
                  {/* Card A: Save Current State (Bento Cell) */}
                  <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                        <Upload className="w-4 h-4 text-emerald-400" /> Записать состояние
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        Записать текущую позицию, баланс, инвентарь и состояние здоровья напрямую в коллекцию Firestore <code className="text-emerald-400">player_saves</code>.
                      </p>
                    </div>

                    {currentPlayerData && (
                      <div className="text-[11px] text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono space-y-1 mb-4">
                        <div className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <span>Баланс: ${currentPlayerData.money}</span></div>
                        <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" /> <span>Здоровье: {Math.round(currentPlayerData.health)}%</span></div>
                        <div className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400 shrink-0" /> <span>Предметов в инвентаре: {currentPlayerData.inventory?.length || 0}</span></div>
                      </div>
                    )}

                    <button
                      onClick={handleSaveProgressToCloud}
                      disabled={saving || !currentPlayerData}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Записать в Firestore
                    </button>
                  </div>

                  {/* Card B: Cloud Save Info & Load (Bento Cell) */}
                  <div className="p-5 bg-slate-950/70 border border-slate-800 rounded-2xl flex flex-col justify-between min-h-[220px]">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-extrabold text-white uppercase tracking-wider mb-2">
                        <Download className="w-4 h-4 text-sky-400" /> Загрузить состояние
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        Загрузить и активировать ранее сохраненную сессию игрока из вашего облачного аккаунта.
                      </p>
                    </div>

                    <div className="mb-4">
                      {loadingSave ? (
                        <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" /> Чтение Firestore...
                        </div>
                      ) : cloudSave ? (
                        <div className="text-[11px] text-slate-300 bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono space-y-1">
                          <div className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Сейв обнаружен
                          </div>
                          <div className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" /> <span>Деньги: ${cloudSave.money}</span></div>
                          <div className="flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" /> <span>Здоровье: {Math.round(cloudSave.health)}%</span></div>
                          <div className="text-[10px] text-slate-500">
                            Координаты: ({Math.round(cloudSave.position.x)}, {Math.round(cloudSave.position.y)})
                          </div>
                        </div>
                      ) : (
                        <div className="py-6 text-center text-xs text-slate-500 italic bg-slate-900 p-3 rounded-xl border border-slate-800">
                          Облачных сохранений в Firestore пока нет.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleApplyCloudSave}
                      disabled={!cloudSave}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      Применить Облачный Сейв
                    </button>
                  </div>

                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Firestore DB: Connected</span>
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

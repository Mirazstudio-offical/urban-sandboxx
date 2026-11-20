import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
  UserCheck,
  Server
} from 'lucide-react';
import { onlineManager, type ServerAuthChallenge, type ServerAuthState } from '../onlineSystem';
import { sound } from '../audio';

interface ServerAuthModalProps {
  isMainMenuOpen: boolean;
  onDisconnectToMenu: () => void;
}

export const ServerAuthModal: React.FC<ServerAuthModalProps> = ({
  isMainMenuOpen,
  onDisconnectToMenu
}) => {
  const [authState, setAuthState] = useState<ServerAuthState>(onlineManager.authState);
  const [challenge, setChallenge] = useState<ServerAuthChallenge | null>(onlineManager.authChallenge);
  const [kickReason, setKickReason] = useState<string | null>(onlineManager.authKickReason);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      setAuthState(onlineManager.authState);
      setChallenge(onlineManager.authChallenge ? { ...onlineManager.authChallenge } : null);
      setKickReason(onlineManager.authKickReason);
    };
    sync();
    const unsub = onlineManager.subscribe(sync);
    return () => { unsub(); };
  }, []);

  // Reset form fields when a fresh challenge appears or mode switches
  useEffect(() => {
    if (challenge) {
      setPassword('');
      setConfirmPassword('');
      setLocalError(null);
      setShowPassword(false);
      window.setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 40);
    }
  }, [challenge?.mode, challenge?.roomCode, challenge?.nickname]);

  if (isMainMenuOpen) return null;

  const isKicked = authState === 'kicked' && Boolean(kickReason);
  if (!challenge && !isKicked) return null;

  const handleDisconnect = () => {
    sound.playButtonPress();
    onlineManager.clearAuthKick();
    onDisconnectToMenu();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || challenge.submitting) return;
    sound.playButtonPress();

    const trimmed = password.trim();
    if (trimmed.length < 4) {
      setLocalError('Пароль должен содержать минимум 4 символа.');
      return;
    }
    if (trimmed.length > 64) {
      setLocalError('Пароль слишком длинный (максимум 64 символа).');
      return;
    }
    if (challenge.mode === 'register' && trimmed !== confirmPassword.trim()) {
      setLocalError('Введённые пароли не совпадают.');
      return;
    }

    setLocalError(null);
    onlineManager.submitServerAuth(trimmed);
  };

  const stopKeyPropagation = (e: React.KeyboardEvent) => {
    e.stopPropagation();
  };

  const displayError = localError || challenge?.error || null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
      onKeyDown={stopKeyPropagation}
    >
      <div className="w-full max-w-md rounded-xl border border-white/12 bg-[#141518] text-[#f1efe9] shadow-2xl overflow-hidden">
        {isKicked ? (
          <div className="p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#d9745a]/15 border border-[#d9745a]/30 flex items-center justify-center shrink-0 text-[#e08a70]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Подключение отклонено
                </h2>
                <p className="text-sm text-[#a8a49a] mt-1 leading-relaxed">
                  {kickReason}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full h-11 rounded-lg bg-[#e0ab45] hover:bg-[#e8b85a] text-[#1a1409] font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Вернуться в главное меню
              </button>
            </div>
          </div>
        ) : challenge ? (
          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-[#e0ab45]/15 border border-[#e0ab45]/30 flex items-center justify-center shrink-0 text-[#e0ab45]">
                {challenge.mode === 'register' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <KeyRound className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  {challenge.mode === 'register'
                    ? 'Регистрация на сервере'
                    : 'Вход в аккаунт сервера'}
                </h2>
                <p className="text-xs text-[#a8a49a] mt-1 leading-relaxed">
                  {challenge.mode === 'register'
                    ? 'Придумайте личный пароль для вашего ника. Он защитит ваш профиль и сохранение на этом сервере от чужого входа.'
                    : 'Этот ник зарегистрирован на сервере. Введите ваш личный пароль, чтобы продолжить игру со своим сохранением.'}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white/[0.04] border border-white/8 px-3.5 py-2.5 flex flex-col gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#9e9a90] flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" />
                  Сервер
                </span>
                <span className="text-white font-medium truncate max-w-[240px]">
                  {challenge.serverName || `Сервер ${challenge.roomCode}`}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#9e9a90] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Никнейм
                </span>
                <span className="text-[#e0ab45] font-semibold truncate max-w-[240px]">
                  {challenge.nickname}
                </span>
              </div>
              {challenge.mode === 'login' && typeof challenge.attemptsLeft === 'number' && (
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/8">
                  <span className="text-[#9e9a90]">Осталось попыток</span>
                  <span className={challenge.attemptsLeft <= 1 ? 'text-[#e08a70] font-semibold' : 'text-[#d8d4ca] font-medium'}>
                    {challenge.attemptsLeft}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-[#b8b4aa] mb-1.5">
                  {challenge.mode === 'register' ? 'Придумайте пароль (от 4 символов)' : 'Ваш пароль'}
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    onKeyDown={stopKeyPropagation}
                    disabled={Boolean(challenge.submitting)}
                    autoComplete={challenge.mode === 'register' ? 'new-password' : 'current-password'}
                    placeholder="Введите пароль"
                    className="w-full h-11 rounded-lg bg-[#0d0e10] border border-white/15 focus:border-[#e0ab45] focus:outline-none px-3.5 pr-10 text-sm text-white placeholder:text-[#6e6b64]"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8f8b82] hover:text-white cursor-pointer"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {challenge.mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-[#b8b4aa] mb-1.5">
                    Повторите пароль
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    onKeyDown={stopKeyPropagation}
                    disabled={Boolean(challenge.submitting)}
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
                    className="w-full h-11 rounded-lg bg-[#0d0e10] border border-white/15 focus:border-[#e0ab45] focus:outline-none px-3.5 text-sm text-white placeholder:text-[#6e6b64]"
                  />
                </div>
              )}
            </div>

            {displayError && (
              <div className="rounded-lg bg-[#d9745a]/12 border border-[#d9745a]/30 px-3 py-2 text-xs text-[#f0a28c] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={Boolean(challenge.submitting)}
                className="w-full h-11 rounded-lg bg-[#e0ab45] hover:bg-[#e8b85a] disabled:opacity-60 text-[#1a1409] font-semibold text-sm transition-colors cursor-pointer"
              >
                {challenge.submitting
                  ? 'Проверка...'
                  : challenge.mode === 'register'
                    ? 'Зарегистрироваться и войти'
                    : 'Войти на сервер'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full h-10 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-[#c9c5bc] text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Отключиться и выйти в меню
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};

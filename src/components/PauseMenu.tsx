import React, { useState } from 'react';
import { 
  Play, 
  Save, 
  Sliders, 
  LogOut, 
  User, 
  Globe, 
  Activity,
  Check,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onExitToMainMenu: () => void;
  onOpenOnline?: () => void;
  onOpenProfile?: () => void;
  onOpenDiagnostics?: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onExitToMainMenu,
  onOpenOnline,
  onOpenProfile,
  onOpenDiagnostics
}) => {
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);
  const [confirmExit, setConfirmExit] = useState<boolean>(false);

  const handleSaveClick = () => {
    onSave();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#080a0e]/90 backdrop-blur-2xl text-[#f0f3f6] font-sans select-none p-3 sm:p-6 md:p-8 animate-in fade-in duration-200 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col justify-between items-center gap-4 overflow-y-auto pr-1">
      {/* Background Subtle Tech Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="pauseGridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#ffffff" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pauseGridPattern)" />
        </svg>
      </div>

      {/* TOP HEADER: Clean Brand Emblem with Generous Clearance */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between pb-4 sm:pb-6 pt-1 border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-2.5 sm:w-3 h-7 sm:h-8 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_16px_rgba(198,138,53,0.6)]" />
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-widest text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <p className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-1">
              СИМУЛЯЦИЯ НА ПАУЗЕ
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 bg-[#12151d] border border-white/10 rounded-lg text-xs font-mono text-[#8b929e]">
          <span>ГОРЯЧАЯ КЛАВИША:</span>
          <kbd className="px-2 py-0.5 bg-white/10 text-white rounded text-[11px] font-bold border border-white/10">
            ESC
          </kbd>
        </div>
      </header>

      {/* CENTER CONTENT: Spacious Modern Tile Grid */}
      <main className="relative z-10 py-3 sm:py-6 w-full flex-1 flex flex-col justify-center gap-4 sm:gap-5">
        
        {/* 1. DOMINANT HERO RESUME TILE */}
        <button
          onClick={onResume}
          className="group relative flex items-center justify-between w-full p-4 sm:p-6 bg-gradient-to-r from-[#141822] via-[#161b26] to-[#12151d] hover:from-[#1a2030] hover:to-[#171c26] border-2 border-[#c68a35] hover:shadow-[0_0_35px_rgba(198,138,53,0.35)] rounded-xl transition-all duration-200 cursor-pointer text-left overflow-hidden min-h-[64px]"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-[#c68a35]/15 to-transparent pointer-events-none" />

          <div className="flex items-center gap-3.5 sm:gap-5 min-w-0">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-lg bg-[#c68a35] text-black flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(198,138,53,0.5)] group-hover:scale-105 transition-transform duration-200">
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current translate-x-0.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black italic tracking-wide text-white uppercase font-sans leading-tight group-hover:text-[#c68a35] transition-colors truncate">
                ПРОДОЛЖИТЬ РЕЙС
              </h2>
              <p className="text-[11px] sm:text-xs text-[#8b929e] mt-0.5 font-mono truncate">
                Вернуться к прямому управлению транспортом и персонажем
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0 pr-2">
            <span className="text-xs font-mono font-bold text-[#c68a35] tracking-wider uppercase">
              В ИГРУ
            </span>
            <div className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/80 group-hover:text-white group-hover:bg-[#c68a35]/20 group-hover:border-[#c68a35]/40 transition-colors">
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </button>

        {/* 2. SECONDARY ACTION TILES (Spacious 2-column grid with breathing room) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
          
          {/* Tile A: Quick Save */}
          <button
            onClick={handleSaveClick}
            className="group relative flex flex-col justify-between p-4 sm:p-5 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] rounded-xl transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-[0_8px_25px_rgba(198,138,53,0.15)] min-h-[140px]"
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-[#c68a35]/15 border border-[#c68a35]/30 text-[#c68a35] group-hover:bg-[#c68a35] group-hover:text-black transition-colors">
                  {savedFeedback ? <Check className="w-6 h-6 stroke-[3]" /> : <Save className="w-6 h-6" />}
                </div>
                {savedFeedback && (
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded">
                    СОХРАНЕНО
                  </span>
                )}
              </div>
              <h3 className="text-base font-black uppercase tracking-wider text-white mt-4 font-sans group-hover:text-[#c68a35] transition-colors">
                СОХРАНИТЬ ИГРУ
              </h3>
              <p className="text-xs text-[#8b929e] mt-1.5 leading-relaxed font-mono">
                Записать текущую позицию, состояние авто и мира в архив
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
              <span>СЛОТ СОХРАНЕНИЯ</span>
              <span className="text-[#c68a35] font-bold">БЫСТРАЯ ЗАПИСЬ</span>
            </div>
          </button>

          {/* Tile B: Settings */}
          <button
            onClick={onOpenSettings}
            className="group relative flex flex-col justify-between p-4 sm:p-5 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] rounded-xl transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-[0_8px_25px_rgba(198,138,53,0.15)] min-h-[140px]"
          >
            <div>
              <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors w-fit">
                <Sliders className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mt-3 font-sans group-hover:text-[#c68a35] transition-colors">
                НАСТРОЙКИ
              </h3>
              <p className="text-[11px] sm:text-xs text-[#8b929e] mt-1 leading-relaxed font-mono">
                Видео, аудио, раскладка клавиатуры и параметры симуляции
              </p>
            </div>
            <div className="mt-4 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
              <span>КОНФИГУРАЦИЯ</span>
              <span className="text-white/80">ОПЦИИ</span>
            </div>
          </button>

          {/* Tile C: Profile / Account */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="group relative flex flex-col justify-between p-4 sm:p-5 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] rounded-xl transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-[0_8px_25px_rgba(198,138,53,0.15)] min-h-[140px]"
            >
              <div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors w-fit">
                  <User className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mt-3 font-sans group-hover:text-[#c68a35] transition-colors">
                  ДОСЬЕ ВОДИТЕЛЯ
                </h3>
                <p className="text-[11px] sm:text-xs text-[#8b929e] mt-1 leading-relaxed font-mono">
                  Личное дело, баланс, статистика и синхронизация облака
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
                <span>ПРОФИЛЬ</span>
                <span className="text-white/80">ВОДИТЕЛЬ</span>
              </div>
            </button>
          )}

          {/* Tile D: Online P2P */}
          {onOpenOnline && (
            <button
              onClick={onOpenOnline}
              className="group relative flex flex-col justify-between p-4 sm:p-5 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] rounded-xl transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-[0_8px_25px_rgba(198,138,53,0.15)] min-h-[140px]"
            >
              <div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors w-fit">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mt-3 font-sans group-hover:text-[#c68a35] transition-colors">
                  СЕТЕВАЯ ИГРА
                </h3>
                <p className="text-[11px] sm:text-xs text-[#8b929e] mt-1 leading-relaxed font-mono">
                  Сетевая P2P комната, синхронизация трафика и список друзей
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
                <span>МУЛЬТИПЛЕЕР</span>
                <span className="text-white/80">P2P СЕТЬ</span>
              </div>
            </button>
          )}

          {/* Tile E: Diagnostics [F2] */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="group relative flex flex-col justify-between p-4 sm:p-5 bg-[#121620] hover:bg-[#181d2a] border border-white/10 hover:border-[#c68a35] rounded-xl transition-all duration-200 cursor-pointer text-left shadow-lg hover:shadow-[0_8px_25px_rgba(198,138,53,0.15)] min-h-[140px]"
            >
              <div>
                <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[#8b929e] group-hover:text-[#c68a35] group-hover:border-[#c68a35]/40 transition-colors w-fit">
                  <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white mt-3 font-sans group-hover:text-[#c68a35] transition-colors">
                  ДИАГНОСТИКА [F2]
                </h3>
                <p className="text-[11px] sm:text-xs text-[#8b929e] mt-1 leading-relaxed font-mono">
                  Монитор частоты кадров, физических сущностей и аудит крашей
                </p>
              </div>
              <div className="mt-4 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-[#8b929e]">
                <span>ТЕЛЕМЕТРИЯ</span>
                <span className="text-white/80">F2 КЛАВИША</span>
              </div>
            </button>
          )}

          {/* Tile F: Exit to Main Menu */}
          <div className="flex flex-col justify-between p-4 sm:p-5 bg-[#141014] hover:bg-[#1c1218] border border-rose-900/40 hover:border-rose-600/60 rounded-xl transition-all duration-200 shadow-lg text-left min-h-[140px]">
            <div>
              <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/40 text-rose-400 w-fit">
                {confirmExit ? <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-rose-300" /> : <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />}
              </div>
              <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-rose-100 mt-3 font-sans">
                В ГЛАВНОЕ МЕНЮ
              </h3>
              <p className="text-[11px] sm:text-xs text-rose-300/70 mt-1 leading-relaxed font-mono">
                {confirmExit ? 'Несохранённый прогресс текущей сессии может быть утерян!' : 'Завершить поездку и вернуться на стартовый экран'}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-rose-900/30 flex items-center justify-between">
              {confirmExit ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={onExitToMainMenu}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer text-center"
                  >
                    Да, выйти
                  </button>
                  <button
                    onClick={() => setConfirmExit(false)}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white/80 font-mono text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmExit(true)}
                  className="w-full py-2 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-200 font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ВЫЙТИ ИЗ РЕЙСА</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER: Minimalist Editorial Status */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-between pt-6 pb-2 border-t border-white/[0.08] text-xs font-mono text-[#8b929e]">
        <div>
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span className="mx-2 text-white/20">·</span>
          <span>ТРАНСПОРТНАЯ СИМУЛЯЦИЯ</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#c68a35]" />
          <span className="text-[#c68a35] font-bold">СЕАНС ПРИОСТАНОВЛЕН</span>
        </div>
      </footer>
      </div>
    </div>
  );
};

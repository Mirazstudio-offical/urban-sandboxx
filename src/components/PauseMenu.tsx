import React from 'react';
import { 
  Play, 
  Save, 
  Sliders, 
  LogOut, 
  User, 
  Globe, 
  Activity, 
  RotateCcw,
  Compass
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
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-between items-center p-6 sm:p-10 bg-[#0b0c0e]/85 backdrop-blur-md text-[#f0f3f6] font-sans select-none animate-in fade-in duration-150">
      
      {/* Top Banner: Logo & Pause Indicator */}
      <div className="pt-8 sm:pt-12 flex flex-col items-center">
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[#14171d]/90 border border-white/10 rounded-[2px] shadow-2xl">
          <div className="w-2.5 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
          <div className="flex flex-col pr-1">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-wider text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-0.5">
              СИМУЛЯЦИЯ НА ПАУЗЕ
            </span>
          </div>
          <div className="w-2.5 h-6 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_12px_rgba(198,138,53,0.5)]" />
        </div>
      </div>

      {/* Center / Lower Horizontal Dock (Authentic BeamNG Style) */}
      <div className="pb-12 sm:pb-20 w-full flex flex-col items-center">
        <div className="flex flex-wrap items-stretch justify-center gap-2 max-w-4xl w-full">
          
          {/* 1. Large Primary Resume Tile */}
          <button
            onClick={onResume}
            className="group relative flex items-center justify-center gap-4 px-8 py-5 min-w-[200px] sm:min-w-[230px] bg-[#14171d]/90 hover:bg-[#1b1f27] border-2 border-[#c68a35] hover:shadow-[0_0_24px_rgba(198,138,53,0.35)] rounded-[3px] transition-all cursor-pointer overflow-hidden"
          >
            <div className="w-0 h-0 border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent border-l-[15px] border-l-[#c68a35] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-left">
              <span className="text-base sm:text-lg font-black italic uppercase tracking-wider text-white font-sans leading-tight">
                ПРОДОЛЖИТЬ
              </span>
              <span className="text-[10px] text-[#c68a35] font-mono tracking-wide">
                Вернуться к управлению
              </span>
            </div>
          </button>

          {/* 2. Quick Save Tile */}
          <button
            onClick={onSave}
            className="group relative flex items-center justify-center gap-3 px-5 py-5 min-w-[140px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
          >
            <Save className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                СОХРАНИТЬ
              </span>
              <span className="text-[9px] text-[#8b929e] font-mono">
                Быстрая запись
              </span>
            </div>
          </button>

          {/* 3. Settings Tile */}
          <button
            onClick={onOpenSettings}
            className="group relative flex items-center justify-center gap-3 px-5 py-5 min-w-[140px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
          >
            <Sliders className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                НАСТРОЙКИ
              </span>
              <span className="text-[9px] text-[#8b929e] font-mono">
                Звук и видео
              </span>
            </div>
          </button>

          {/* 4. Profile Tile */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="group relative flex items-center justify-center gap-3 px-5 py-5 min-w-[130px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
            >
              <User className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  АККАУНТ
                </span>
                <span className="text-[9px] text-[#8b929e] font-mono">
                  Личное дело
                </span>
              </div>
            </button>
          )}

          {/* 5. Online Tile */}
          {onOpenOnline && (
            <button
              onClick={onOpenOnline}
              className="group relative flex items-center justify-center gap-3 px-5 py-5 min-w-[130px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
            >
              <Globe className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  ОНЛАЙН
                </span>
                <span className="text-[9px] text-[#8b929e] font-mono">
                  P2P комната
                </span>
              </div>
            </button>
          )}

          {/* 6. Diagnostics Tile */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="group relative flex items-center justify-center gap-3 px-4 py-5 min-w-[120px] bg-[#14171d]/90 hover:bg-[#1b1f27] border border-white/10 hover:border-[#c68a35] rounded-[3px] transition-all cursor-pointer"
              title="Диагностика производительности [F2]"
            >
              <Activity className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  ЛОГИ [F2]
                </span>
                <span className="text-[9px] text-[#8b929e] font-mono">
                  Диагностика
                </span>
              </div>
            </button>
          )}

          {/* 7. Exit to Main Menu (Red Tile like Quit Game in reference image) */}
          <button
            onClick={onExitToMainMenu}
            className="group relative flex items-center justify-center gap-3 px-6 py-5 min-w-[150px] bg-red-950/80 hover:bg-red-900 border border-red-700/60 hover:border-red-500 rounded-[3px] transition-all cursor-pointer shadow-lg shadow-red-950/40"
          >
            <LogOut className="w-5 h-5 text-red-300 group-hover:text-white transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-white font-sans">
                В МЕНЮ
              </span>
              <span className="text-[9px] text-red-300 font-mono">
                Выйти из рейса
              </span>
            </div>
          </button>

        </div>

        {/* Hotkey hint */}
        <div className="mt-5 text-[11px] font-mono text-[#8b929e]">
          Нажмите <span className="text-white font-bold">ESC</span> для возврата в поездку
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-between items-center text-[10px] font-mono text-[#8b929e] border-t border-white/[0.06] pt-3">
        <span>СТЕПНОЙ ТРАКТ 2D</span>
        <span className="text-[#c68a35] font-bold">РЕЖИМ ПАУЗЫ</span>
      </footer>

    </div>
  );
};

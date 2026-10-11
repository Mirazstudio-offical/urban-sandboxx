import React from 'react';
import { 
  Play, 
  Save, 
  Sliders, 
  LogOut, 
  User, 
  Globe, 
  Activity
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
    <div className="absolute inset-0 z-50 flex flex-col justify-between items-center p-8 sm:p-14 bg-[#080a0e]/85 backdrop-blur-xl text-[#f0f3f6] font-sans select-none animate-in fade-in duration-200">
      
      {/* Top Banner: Logo & Pause Indicator with generous clearance */}
      <div className="pt-6 sm:pt-10 flex flex-col items-center">
        <div className="flex items-center gap-3 px-6 py-3.5 bg-[#12151d]/90 border border-white/10 rounded-[3px] shadow-2xl">
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
          <div className="flex flex-col pr-2">
            <h1 className="text-xl sm:text-2xl font-black italic tracking-widest text-white uppercase font-sans leading-none">
              СТЕПНОЙ ТРАКТ <span className="text-[#c68a35]">2D</span>
            </h1>
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#8b929e] uppercase mt-1">
              СИМУЛЯЦИЯ НА ПАУЗЕ
            </span>
          </div>
          <div className="w-2.5 h-7 bg-[#c68a35] -skew-x-12 shrink-0 shadow-[0_0_14px_rgba(198,138,53,0.5)]" />
        </div>
      </div>

      {/* Spacious Horizontal Dock (Generous gaps, comfortable breathing room) */}
      <div className="pb-16 sm:pb-24 w-full flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-4 max-w-5xl w-full">
          
          {/* 1. Large Primary Resume Tile */}
          <button
            onClick={onResume}
            className="group relative flex items-center justify-center gap-5 px-10 py-6 min-w-[240px] sm:min-w-[280px] bg-[#141720]/95 hover:bg-[#1a1e2a] border-2 border-[#c68a35] hover:shadow-[0_0_30px_rgba(198,138,53,0.4)] rounded-[4px] transition-all cursor-pointer overflow-hidden"
          >
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[16px] border-l-[#c68a35] group-hover:scale-115 transition-transform shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-lg sm:text-xl font-black italic uppercase tracking-wider text-white font-sans leading-tight">
                ПРОДОЛЖИТЬ
              </span>
              <span className="text-[11px] text-[#c68a35] font-mono tracking-wide mt-0.5">
                Вернуться к управлению
              </span>
            </div>
          </button>

          {/* 2. Quick Save Tile */}
          <button
            onClick={onSave}
            className="group relative flex items-center justify-center gap-3.5 px-7 py-6 min-w-[160px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
          >
            <Save className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                СОХРАНИТЬ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
                Быстрая запись
              </span>
            </div>
          </button>

          {/* 3. Settings Tile */}
          <button
            onClick={onOpenSettings}
            className="group relative flex items-center justify-center gap-3.5 px-7 py-6 min-w-[160px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
          >
            <Sliders className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                НАСТРОЙКИ
              </span>
              <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
                Звук и видео
              </span>
            </div>
          </button>

          {/* 4. Profile Tile */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="group relative flex items-center justify-center gap-3.5 px-6 py-6 min-w-[150px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
            >
              <User className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  АККАУНТ
                </span>
                <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
                  Личное дело
                </span>
              </div>
            </button>
          )}

          {/* 5. Online Tile */}
          {onOpenOnline && (
            <button
              onClick={onOpenOnline}
              className="group relative flex items-center justify-center gap-3.5 px-6 py-6 min-w-[150px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] hover:shadow-[0_4px_20px_rgba(198,138,53,0.15)] rounded-[4px] transition-all cursor-pointer"
            >
              <Globe className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  ОНЛАЙН
                </span>
                <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
                  P2P комната
                </span>
              </div>
            </button>
          )}

          {/* 6. Diagnostics Tile */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="group relative flex items-center justify-center gap-3.5 px-5 py-6 min-w-[140px] bg-[#141720]/90 hover:bg-[#1a1e2a] border border-white/10 hover:border-[#c68a35] rounded-[4px] transition-all cursor-pointer"
              title="Диагностика производительности [F2]"
            >
              <Activity className="w-5 h-5 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col text-left">
                <span className="text-sm font-black italic uppercase tracking-wider text-[#d0d5dc] group-hover:text-white font-sans">
                  ЛОГИ [F2]
                </span>
                <span className="text-[10px] text-[#8b929e] font-mono mt-0.5">
                  Диагностика
                </span>
              </div>
            </button>
          )}

          {/* 7. Exit to Main Menu (Red Tile like Quit Game) */}
          <button
            onClick={onExitToMainMenu}
            className="group relative flex items-center justify-center gap-4 px-8 py-6 min-w-[170px] bg-red-950/80 hover:bg-red-900 border border-red-700/60 hover:border-red-500 rounded-[4px] transition-all cursor-pointer shadow-xl shadow-red-950/50"
          >
            <LogOut className="w-5 h-5 text-red-300 group-hover:text-white transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-black italic uppercase tracking-wider text-white font-sans">
                В МЕНЮ
              </span>
              <span className="text-[10px] text-red-300 font-mono mt-0.5">
                Выйти из рейса
              </span>
            </div>
          </button>

        </div>

        {/* Hotkey hint with spacious margin */}
        <div className="mt-8 text-xs font-mono text-[#8b929e]">
          Нажмите <span className="text-white font-bold">ESC</span> для возврата в поездку
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-between items-center text-xs font-mono text-[#8b929e] border-t border-white/[0.08] pt-4">
        <span>СТЕПНОЙ ТРАКТ 2D</span>
        <span className="text-[#c68a35] font-bold">РЕЖИМ ПАУЗЫ</span>
      </footer>

    </div>
  );
};

import React from 'react';
import { Play, Save, Settings, LogOut, Compass, Globe, User, Activity } from 'lucide-react';

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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0c0e]/90 backdrop-blur-md text-[#f0f3f6] font-sans select-none animate-in fade-in duration-150">
      
      {/* Container Card - BeamNG Rectangular Slate Panel */}
      <div className="relative z-10 w-full max-w-md bg-[rgba(20,22,26,0.95)] border border-white/10 rounded-[2px] shadow-2xl flex flex-col p-6 md:p-8">
        
        {/* Header */}
        <div className="mb-6 border-b border-white/[0.08] pb-4">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest text-[#c68a35] uppercase mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>СИМУЛЯЦИЯ НА ПАУЗЕ</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white uppercase">
            МЕНЮ ПАУЗЫ
          </h2>
          <p className="text-xs text-[#8b929e] mt-0.5">
            Выберите дальнейшее действие в симуляторе
          </p>
        </div>

        {/* Buttons List */}
        <div className="flex flex-col gap-2">
          {/* 1. Resume */}
          <button
            onClick={onResume}
            className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
            <Play className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors fill-current/20" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Продолжить поездку</span>
              <span className="text-[10px] text-[#8b929e]">Вернуться к управлению</span>
            </div>
          </button>

          {/* 2. Profile */}
          {onOpenProfile && (
            <button
              onClick={onOpenProfile}
              className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
              <User className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Профиль & Облако</span>
                <span className="text-[10px] text-[#8b929e]">Личное дело водителя и синхронизация</span>
              </div>
            </button>
          )}

          {/* 3. Online */}
          {onOpenOnline && (
            <button
              onClick={onOpenOnline}
              className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Globe className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Онлайн режим P2P</span>
                <span className="text-[10px] text-[#8b929e]">Диспетчерская комната и совместный заезд</span>
              </div>
            </button>
          )}

          {/* 4. Save */}
          <button
            onClick={onSave}
            className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
            <Save className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Сохранить поездку</span>
              <span className="text-[10px] text-[#8b929e]">Записать текущее состояние в архив</span>
            </div>
          </button>

          {/* 5. Settings */}
          <button
            onClick={onOpenSettings}
            className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
            <Settings className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Настройка кабины</span>
              <span className="text-[10px] text-[#8b929e]">Графика, звук, физика и управление</span>
            </div>
          </button>

          {/* 6. Diagnostics */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-[rgba(35,38,45,0.95)] border border-white/[0.08] hover:border-[#c68a35]/40 hover:shadow-[0_4px_16px_rgba(198,138,53,0.25)] rounded-[2px] transition-all text-left cursor-pointer overflow-hidden"
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#c68a35] opacity-0 group-hover:opacity-100 transition-opacity" />
              <Activity className="w-4 h-4 text-[#8b929e] group-hover:text-[#c68a35] transition-colors" />
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-white">Диагностика [F2]</span>
                <span className="text-[10px] text-[#8b929e]">Лог производительности и сущностей</span>
              </div>
            </button>
          )}

          <div className="h-px bg-white/[0.08] my-1" />

          {/* 7. Exit */}
          <button
            onClick={onExitToMainMenu}
            className="group relative flex items-center gap-3.5 px-4 py-3 bg-[rgba(20,22,26,0.82)] hover:bg-red-950/40 border border-white/[0.08] hover:border-red-600/40 text-left rounded-[2px] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            <LogOut className="w-4 h-4 text-[#8b929e] group-hover:text-red-400 transition-colors" />
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-[#f0f3f6] group-hover:text-red-300">Выйти в главное меню</span>
              <span className="text-[10px] text-[#8b929e]">Завершить текущую сессию</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-[#8b929e]">
          <span>СТЕПНОЙ ТРАКТ 2D</span>
          <span>Нажмите Esc для возврата</span>
        </div>

      </div>
    </div>
  );
};

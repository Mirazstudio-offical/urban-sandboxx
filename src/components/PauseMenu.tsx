import React from 'react';
import { Play, Save, Settings, LogOut, Compass } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onSave: () => void;
  onOpenSettings: () => void;
  onExitToMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSave,
  onOpenSettings,
  onExitToMainMenu
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#070b14]/85 backdrop-blur-md text-slate-100 font-sans select-none animate-in fade-in duration-200">
      
      {/* Background glow */}
      <div className="absolute w-[500px] h-[300px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Container Card */}
      <div className="relative z-10 w-full max-w-md bg-[#0f1523]/95 border border-slate-800/90 rounded-3xl shadow-2xl flex flex-col p-8 md:p-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-700/60 rounded-full text-slate-300 text-xs font-bold tracking-widest uppercase mb-3 shadow-inner">
            <Compass className="w-3.5 h-3.5 text-emerald-400" /> Симуляция на паузе
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white">
            МЕНЮ ПАУЗЫ
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Выберите дальнейшее действие в игре
          </p>
        </div>

        {/* Buttons List */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all font-bold text-sm text-white group cursor-pointer active:scale-[0.99] shadow-lg"
          >
            <Play className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform fill-emerald-400" />
            <span>Продолжить игру</span>
          </button>

          <button
            onClick={onSave}
            className="flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all font-bold text-sm text-white group cursor-pointer active:scale-[0.99] shadow-lg"
          >
            <Save className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>Сохранить игру</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-4 px-5 py-4 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all font-bold text-sm text-white group cursor-pointer active:scale-[0.99] shadow-lg"
          >
            <Settings className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span>Настройки симулятора</span>
          </button>

          <div className="h-px bg-slate-800/80 my-1" />

          <button
            onClick={onExitToMainMenu}
            className="flex items-center gap-4 px-5 py-4 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/30 rounded-2xl transition-all font-bold text-sm text-rose-200 hover:text-white group cursor-pointer active:scale-[0.99]"
          >
            <LogOut className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
            <span>Выйти в главное меню</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-500">
          Metropolis 2D // Нажмите Esc для возврата
        </div>

      </div>
    </div>
  );
};

import React from 'react';
import { AlertOctagon, ArrowRight, X } from 'lucide-react';
import { CrashReport } from '../crashLogger';

interface CrashAlertToastProps {
  crashReport: CrashReport;
  onOpenDiagnostics: () => void;
  onDismiss: () => void;
}

export const CrashAlertToast: React.FC<CrashAlertToastProps> = ({
  crashReport,
  onOpenDiagnostics,
  onDismiss
}) => {
  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] max-w-lg w-[92vw] sm:w-auto bg-rose-950/95 border border-rose-600/80 rounded-2xl shadow-2xl p-3.5 sm:p-4 text-white backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-900/80 border border-rose-500/50 flex items-center justify-center text-rose-300 shrink-0">
          <AlertOctagon className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-300">
            Аварийный сбой предыдущей сессии
          </div>
          <div className="text-sm font-medium text-slate-100 line-clamp-2 mt-0.5">
            {crashReport.reason || 'Вкладка браузера была перезагружена или завершилась с ошибкой памяти'}
          </div>
          {crashReport.lastSnapshot?.memory?.usedJSHeapSizeMB && (
            <div className="text-[11px] text-rose-200/80 mt-1 font-mono">
              Память перед падением: {crashReport.lastSnapshot.memory.usedJSHeapSizeMB} MB | Время работы: {crashReport.uptimeSeconds}с
            </div>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={onOpenDiagnostics}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow"
            >
              <span>Открыть лог диагностики</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onDismiss}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs transition cursor-pointer border border-rose-800/40"
            >
              Закрыть
            </button>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-6 h-6 rounded-lg text-rose-400 hover:text-white transition flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

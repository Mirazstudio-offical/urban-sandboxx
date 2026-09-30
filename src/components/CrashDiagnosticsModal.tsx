import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertOctagon, 
  AlertTriangle, 
  Check, 
  Copy, 
  Download, 
  Flame, 
  Info, 
  Layers, 
  RefreshCw, 
  Server, 
  Trash2, 
  Volume2, 
  Wrench, 
  X 
} from 'lucide-react';
import { crashLogger, LogEntry, CrashReport, TelemetrySnapshot } from '../crashLogger';
import { performanceConfig } from '../performanceConfig';
import { clearInteriorCanvasCache } from '../buildingInteriors';
import { sound } from '../audio';

interface CrashDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSnapshot?: TelemetrySnapshot | null;
  onEmergencyPurge?: () => void;
}

export const CrashDiagnosticsModal: React.FC<CrashDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  currentSnapshot,
  onEmergencyPurge
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'logs' | 'crashes' | 'system'>('live');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'memory' | 'info'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [savedCrashes, setSavedCrashes] = useState<CrashReport[]>([]);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);
  const [memoryInfo, setMemoryInfo] = useState(crashLogger.getMemoryInfo());

  useEffect(() => {
    if (!isOpen) return;

    setLogs([...crashLogger.getLogs()]);
    setSavedCrashes(crashLogger.getSavedCrashReports());
    setMemoryInfo(crashLogger.getMemoryInfo());

    const unsub = crashLogger.subscribe((entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 250)]);
    });

    const timer = setInterval(() => {
      setMemoryInfo(crashLogger.getMemoryInfo());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'all') return true;
    if (logFilter === 'error') return l.level === 'error';
    if (logFilter === 'warn') return l.level === 'warn';
    if (logFilter === 'memory') return l.level === 'memory';
    if (logFilter === 'info') return l.level === 'info' || l.level === 'lifecycle';
    return true;
  });

  const handleCopyDiagnostics = () => {
    const jsonStr = crashLogger.exportDiagnosticJSON();
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    });
  };

  const handleRunEmergencyPurge = () => {
    // 1. Purge interior cache
    clearInteriorCanvasCache();

    // 2. Trigger parent memory purge if provided
    if (onEmergencyPurge) {
      onEmergencyPurge();
    }

    // 3. Clear particle pool
    if ((globalThis as any)._particlePool) {
      (globalThis as any)._particlePool.length = 0;
    }

    crashLogger.recordInfo('MemoryPurge', 'Manual Emergency Memory Purge executed by user');
    setPurgeSuccess(true);
    setLogs([...crashLogger.getLogs()]);
    setMemoryInfo(crashLogger.getMemoryInfo());
    setTimeout(() => setPurgeSuccess(false), 2500);
  };

  const handleClearLogs = () => {
    crashLogger.clearLogs();
    setLogs([]);
  };

  const handleClearCrashes = () => {
    crashLogger.clearSavedCrashReports();
    setSavedCrashes([]);
  };

  const memoryPercent = memoryInfo?.memoryPressureRatio 
    ? Math.round(memoryInfo.memoryPressureRatio * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Диагностика и Лог Сбоев (Blackbox Recorder)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Telemetry Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Мониторинг памяти браузера, переполнения сущностей и логов падений
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyDiagnostics}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-slate-700 active:scale-95"
              title="Скопировать полный отчет диагностики в буфер обмена"
            >
              {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedToast ? 'Скопировано!' : 'Копировать'}</span>
            </button>

            <button
              onClick={() => crashLogger.downloadDiagnosticFile()}
              className="p-2 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 transition cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-indigo-500/30 active:scale-95"
              title="Скачать файл диагностики .json"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Экспорт</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition flex items-center justify-center cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-slate-800 bg-slate-900/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'live'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Память и Телеметрия</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Журнал Событий</span>
            {logs.some((l) => l.level === 'error') && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('crashes')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'crashes'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Сбои и Краши ({savedCrashes.length})</span>
          </button>
        </div>

        {/* TAB 1: LIVE MEMORY & TELEMETRY */}
        {activeTab === 'live' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Memory Pressure Gauge */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">JavaScript Heap Memory (Память вкладки)</span>
                </div>
                {memoryInfo ? (
                  <span className="text-xs font-mono text-slate-300">
                    {memoryInfo.usedJSHeapSizeMB} MB / {memoryInfo.jsHeapSizeLimitMB} MB ({memoryPercent}%)
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">API доступен в Chromium / Chrome</span>
                )}
              </div>

              {memoryInfo && (
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-300 ${
                      memoryPercent > 80
                        ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                        : memoryPercent > 50
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, memoryPercent))}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Выделено (Used)</div>
                  <div className="text-white font-mono font-medium">{memoryInfo?.usedJSHeapSizeMB ?? 'N/A'} MB</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Общий Heap (Total)</div>
                  <div className="text-white font-mono font-medium">{memoryInfo?.totalJSHeapSizeMB ?? 'N/A'} MB</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Лимит вкладки (Limit)</div>
                  <div className="text-white font-mono font-medium">{memoryInfo?.jsHeapSizeLimitMB ?? 'N/A'} MB</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px] uppercase">Статус нагрузки</div>
                  <div className={`font-medium ${memoryPercent > 80 ? 'text-rose-400 font-bold animate-pulse' : memoryPercent > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {memoryPercent > 80 ? 'КРИТИЧЕСКИЙ' : memoryPercent > 50 ? 'Повышенный' : 'В норме'}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time World Entity Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Транспорт (Vehicles)</div>
                <div className="text-lg font-bold text-sky-400 font-mono">
                  {currentSnapshot?.entities.vehicles ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Авто / Прицепы</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Пешеходы (Peds)</div>
                <div className="text-lg font-bold text-purple-400 font-mono">
                  {currentSnapshot?.entities.pedestrians ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">AI Жители</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Частицы (Particles)</div>
                <div className="text-lg font-bold text-amber-400 font-mono">
                  {currentSnapshot?.entities.particles ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Дым / Огонь / Вода</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Следы шин (SkidMarks)</div>
                <div className="text-lg font-bold text-slate-300 font-mono">
                  {currentSnapshot?.entities.skidMarks ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Колея на грунте</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Пятна жидкостей</div>
                <div className="text-lg font-bold text-rose-400 font-mono">
                  {currentSnapshot?.entities.stains ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Масло / Бензин / Вода</div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-slate-500 text-[10px] uppercase font-semibold mb-1">Предметы (Ground)</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">
                  {currentSnapshot?.entities.groundItems ?? 0}
                </div>
                <div className="text-[10px] text-slate-500">Лут на карте</div>
              </div>
            </div>

            {/* Quick Actions & Emergency Cleanup */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  Экстренная очистка памяти (Memory Purge)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Освобождает буферы частиц, очищает кэш интерьеров, сбрасывает звуковые ноды и освобождает память.
                </p>
              </div>

              <button
                onClick={handleRunEmergencyPurge}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 shadow-lg active:scale-95 ${
                  purgeSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                }`}
              >
                {purgeSuccess ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                <span>{purgeSuccess ? 'Память очищена!' : 'Очистить память сейчас'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: LOGS VIEWER */}
        {activeTab === 'logs' && (
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            {/* Filter Buttons */}
            <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                {(['all', 'error', 'warn', 'memory', 'info'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer capitalize font-medium ${
                      logFilter === filter
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {filter === 'all' ? `Все (${logs.length})` : filter}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClearLogs}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 transition text-xs flex items-center gap-1 cursor-pointer border border-slate-700 hover:border-rose-700/50"
                title="Очистить текущие логи"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Очистить</span>
              </button>
            </div>

            {/* Logs Stream */}
            <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1.5 pr-2 select-text">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Журнал логов пуст
                </div>
              ) : (
                filteredLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2 rounded-lg border flex flex-col gap-1 ${
                      entry.level === 'error'
                        ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                        : entry.level === 'warn'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                        : entry.level === 'memory'
                        ? 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        [{entry.timestamp}] [{entry.category}]
                      </span>
                      <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-slate-800/80">
                        {entry.level}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{entry.message}</div>
                    {entry.stack && (
                      <div className="text-[10px] text-rose-300/80 mt-1 bg-black/40 p-2 rounded overflow-x-auto whitespace-pre">
                        {entry.stack}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CRASHES ARCHIVE */}
        {activeTab === 'crashes' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">История Сбоев Вкладки Браузера</h3>
                <p className="text-xs text-slate-400">
                  Сохраняется в хранилище при внезапных перезагрузках или падении процесса страницы
                </p>
              </div>

              {savedCrashes.length > 0 && (
                <button
                  onClick={handleClearCrashes}
                  className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-200 transition text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Очистить историю</span>
                </button>
              )}
            </div>

            {savedCrashes.length === 0 ? (
              <div className="text-center py-16 bg-slate-950/40 rounded-2xl border border-slate-800">
                <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <div className="text-sm font-semibold text-white">Критических сбоев не зарегистрировано</div>
                <div className="text-xs text-slate-400 mt-1">Все сессии завершились корректно</div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedCrashes.map((crash) => (
                  <div
                    key={crash.id}
                    className="bg-slate-950/60 border border-rose-900/40 rounded-xl p-4 text-xs font-mono"
                  >
                    <div className="flex items-center justify-between text-rose-400 font-bold mb-2">
                      <div className="flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4" />
                        <span>{crash.reason}</span>
                      </div>
                      <span className="text-slate-400 font-normal">{new Date(crash.crashTimeMs).toLocaleString()}</span>
                    </div>

                    {crash.errorDetails && (
                      <div className="bg-black/50 p-2.5 rounded-lg border border-rose-950 text-rose-200 mb-2 overflow-x-auto">
                        <div className="font-semibold">{crash.errorDetails.message}</div>
                        {crash.errorDetails.stack && (
                          <div className="text-[10px] text-slate-400 mt-1 whitespace-pre">
                            {crash.errorDetails.stack}
                          </div>
                        )}
                      </div>
                    )}

                    {crash.lastSnapshot && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500">FPS перед сбоем:</span> {crash.lastSnapshot.fps}
                        </div>
                        <div>
                          <span className="text-slate-500">Транспорт / Пешеходы:</span> {crash.lastSnapshot.entities.vehicles} / {crash.lastSnapshot.entities.pedestrians}
                        </div>
                        <div>
                          <span className="text-slate-500">Частицы:</span> {crash.lastSnapshot.entities.particles}
                        </div>
                        <div>
                          <span className="text-slate-500">Память Heap:</span> {crash.lastSnapshot.memory?.usedJSHeapSizeMB ?? 'N/A'} MB
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <div>
            Нажмите <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">F2</kbd> или кнопку на HUD для быстрого доступа к диагностике
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition cursor-pointer font-medium"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};

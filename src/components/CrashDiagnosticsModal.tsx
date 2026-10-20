import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertOctagon, 
  AlertTriangle, 
  Check, 
  Copy, 
  Cpu, 
  Download, 
  Flame, 
  Info, 
  Layers, 
  RefreshCw, 
  RotateCcw, 
  Server, 
  Trash2, 
  Volume2, 
  Wrench, 
  X, 
  Zap,
  Sliders
} from 'lucide-react';
import { crashLogger, LogEntry, CrashReport, TelemetrySnapshot } from '../crashLogger';
import { performanceConfig } from '../performanceConfig';
import { clearInteriorCanvasCache } from '../buildingInteriors';
import { sound } from '../audio';
import { Vehicle } from '../types';
import { 
  ensureVehicleNodeBeam, 
  createVehicleNodeBeamSystem 
} from '../nodeBeamPhysics';
import { applyVehicleDamageAndDeformation } from '../physics';
import {
  listAllMeshPresets,
  getVehicleNodeBeamDefinition
} from '../vehicleMeshConfigs';

interface CrashDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSnapshot?: TelemetrySnapshot | null;
  onEmergencyPurge?: () => void;
  activeVehicle?: Vehicle | null;
}

export const CrashDiagnosticsModal: React.FC<CrashDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  currentSnapshot,
  onEmergencyPurge,
  activeVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'live' | 'logs' | 'crashes' | 'nodebeam' | 'system'>('live');
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'memory' | 'info'>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [savedCrashes, setSavedCrashes] = useState<CrashReport[]>([]);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [purgeSuccess, setPurgeSuccess] = useState<boolean>(false);
  const [memoryInfo, setMemoryInfo] = useState(crashLogger.getMemoryInfo());
  const [simTick, setSimTick] = useState<number>(0);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Initialize nodeBeam if activeVehicle present
  const nodeBeamSystem = activeVehicle ? ensureVehicleNodeBeam(activeVehicle) : null;

  useEffect(() => {
    if (!isOpen || activeTab !== 'nodebeam' || !nodeBeamSystem || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const renderWireframe = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const scale = 6.8;

      // Dark background grid
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Center Axis
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cx - 160, cy);
      ctx.lineTo(cx + 160, cy);
      ctx.moveTo(cx, cy - 100);
      ctx.lineTo(cx, cy + 100);
      ctx.stroke();
      ctx.setLineDash([]);

      const nodes = nodeBeamSystem.nodes;
      const beams = nodeBeamSystem.beams;

      // Draw Beams
      for (const b of beams) {
        const nA = nodes[b.nodeA];
        const nB = nodes[b.nodeB];
        if (!nA || !nB) continue;

        const x1 = cx + nA.x * scale;
        const y1 = cy + nA.y * scale;
        const x2 = cx + nB.x * scale;
        const y2 = cy + nB.y * scale;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (b.broken) {
          // Snapped Beam
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1.0;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Stress-colored beam
          const stress = b.currentStress || 0;
          if (b.type === 'support') {
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1.0;
          } else if (b.type === 'chassis_rail') {
            ctx.lineWidth = 2.4;
            if (stress > 0.15) ctx.strokeStyle = '#ef4444';
            else if (stress > 0.08) ctx.strokeStyle = '#f97316';
            else if (stress > 0.03) ctx.strokeStyle = '#eab308';
            else ctx.strokeStyle = '#38bdf8';
          } else {
            ctx.lineWidth = b.type === 'cross' ? 1.1 : 1.8;
            if (stress > 0.20) ctx.strokeStyle = '#ef4444';
            else if (stress > 0.10) ctx.strokeStyle = '#f97316';
            else if (stress > 0.04) ctx.strokeStyle = '#eab308';
            else ctx.strokeStyle = b.type === 'cross' ? 'rgba(52, 211, 153, 0.6)' : '#10b981';
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw Nodes
      for (const n of nodes) {
        const nx = cx + n.x * scale;
        const ny = cy + n.y * scale;

        let nodeColor = '#06b6d4';
        let radius = 3.2;

        if (n.group === 'engine') {
          nodeColor = '#f59e0b';
          radius = 5.0;
        } else if (n.group === 'subframe') {
          nodeColor = '#3b82f6';
          radius = 4.2;
        } else if (n.group === 'chassis_core') {
          nodeColor = '#818cf8';
          radius = 4.5;
        } else if (n.group === 'roof') {
          nodeColor = '#10b981';
          radius = 3.0;
        } else if (n.group === 'door' || n.group === 'pillar') {
          nodeColor = '#a855f7';
          radius = 3.4;
        }

        // Plastic yield red halo
        if ((n.plasticStrain || 0) > 0.2) {
          ctx.fillStyle = `rgba(239, 68, 68, ${Math.min(0.7, n.plasticStrain * 0.35)})`;
          ctx.beginPath();
          ctx.arc(nx, ny, radius + 4.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Main node dot
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(nx, ny, radius, 0, Math.PI * 2);
        ctx.fill();

        // Node ID label
        ctx.fillStyle = 'rgba(203, 213, 225, 0.75)';
        ctx.font = '8px monospace';
        ctx.fillText(String(n.id), nx + 4, ny - 3);
      }

      animId = requestAnimationFrame(renderWireframe);
    };

    renderWireframe();
    return () => cancelAnimationFrame(animId);
  }, [isOpen, activeTab, simTick, activeVehicle]);

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
    <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden flex items-start sm:items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div className="my-auto relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-bold tracking-tight text-white truncate">
                  Диагностика и Лог Сбоев (Blackbox Recorder)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30 shrink-0">
                  Telemetry Active
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate hidden sm:block">
                Мониторинг памяти браузера, переполнения сущностей и логов падений
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyDiagnostics}
              className="p-1.5 sm:p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-medium border border-slate-700 active:scale-95"
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

          <button
            onClick={() => setActiveTab('nodebeam')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'nodebeam'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>BeamNG 2D Софтбоди</span>
            {activeVehicle?.damage?.nodeBeam && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
                {activeVehicle.damage.nodeBeam.nodes.length}N
              </span>
            )}
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

        {/* TAB 4: BEAMNG 2D NODE-BEAM SOFTBODY */}
        {activeTab === 'nodebeam' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Модель упругопластической деформации Node-Beam 2D (BeamNG.drive)
                </h3>
                <p className="text-xs text-slate-400">
                  Реальная физика связей с пределом текучести (Yield Stress), разрывом балок (Break) и демпфированием
                </p>
              </div>

              {activeVehicle && (
                <div className="text-right">
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-2 py-1 rounded border border-cyan-800">
                    {activeVehicle.nameRu || activeVehicle.type} ({(activeVehicle.mass || 1400)} кг)
                  </span>
                </div>
              )}
            </div>

            {/* Wireframe Canvas */}
            <div className="relative bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col items-center p-2">
              <canvas
                ref={canvasRef}
                width={620}
                height={260}
                className="w-full max-w-[620px] h-[260px] rounded-lg shadow-inner"
              />

              {/* Canvas Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-slate-400 mt-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Бампер / Периметр
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Подрамник / Лонжероны
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Двигатель (Блок)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Двери / Стойки
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Каркас крыши
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500" /> Разрыв связи (Snap)
                </span>
              </div>
            </div>

            {/* Mesh Configuration & Archetype Presets */}
            {activeVehicle && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Конфигурация сетки модели (Vehicle Mesh Preset)</span>
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                    {activeVehicle.damage?.nodeBeam?.presetName || 'Стандартная сетка'}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {listAllMeshPresets().map((preset) => {
                    const isSelected = (activeVehicle.damage?.nodeBeam?.presetId || '') === preset.presetId;
                    return (
                      <button
                        key={preset.presetId}
                        onClick={() => {
                          if (!activeVehicle) return;
                          activeVehicle.customMeshConfig = { ...preset };
                          activeVehicle.damage.nodeBeam = createVehicleNodeBeamSystem(activeVehicle);
                          if (activeVehicle.damage.deformedVertices) {
                            for (const v of activeVehicle.damage.deformedVertices) {
                              v.offsetX = 0;
                              v.offsetY = 0;
                              v.targetOffsetX = 0;
                              v.targetOffsetY = 0;
                              v.elasticX = 0;
                              v.elasticY = 0;
                              v.velX = 0;
                              v.velY = 0;
                              v.plasticStrain = 0;
                            }
                          }
                          setSimTick(t => t + 1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-cyan-400" />}
                        <span>{preset.name}</span>
                        <span className="text-[10px] opacity-60">({preset.nodes.length}N / {preset.beams.length}B)</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            {activeVehicle?.damage?.nodeBeam ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Узлы (Nodes)</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono">
                    {activeVehicle.damage.nodeBeam.nodes.length}
                  </div>
                  <div className="text-[10px] text-slate-400">Точечные массы кузова</div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Связи (Beams)</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {activeVehicle.damage.nodeBeam.beams.filter(b => !b.broken).length} / {activeVehicle.damage.nodeBeam.beams.length}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Разорвано: <span className="text-rose-400 font-bold">{activeVehicle.damage.nodeBeam.brokenBeamCount || 0}</span>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Смятие (Crumple)</div>
                  <div className="text-sm font-bold text-amber-400 font-mono">
                    F: {(activeVehicle.damage.frontCrumple || 0).toFixed(1)} px | R: {(activeVehicle.damage.rearCrumple || 0).toFixed(1)} px
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Бока: L: {(activeVehicle.damage.leftDent || 0).toFixed(1)} / R: {(activeVehicle.damage.rightDent || 0).toFixed(1)} px
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                  <div className="text-slate-500 text-[10px] uppercase font-semibold">Геометрия рамы</div>
                  <div className="text-sm font-bold text-purple-400 font-mono">
                    Увод: {((activeVehicle.damage.steeringDrift || 0) * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {Math.abs(activeVehicle.damage.steeringDrift || 0) > 0.15 ? 'Искривление подрамника' : 'Лонжероны в допуске'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-slate-400 text-xs">
                Транспортное средство не выбрано. Сядьте в машину или выберите автомобиль для анализа софтбоди.
              </div>
            )}

            {/* Test Simulation Controls */}
            {activeVehicle && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Лабораторные краш-тесты (Direct Impulse Injection)
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      if (!activeVehicle) return;
                      const cosA = Math.cos(activeVehicle.angle);
                      const sinA = Math.sin(activeVehicle.angle);
                      const halfL = activeVehicle.length / 2;
                      applyVehicleDamageAndDeformation(
                        activeVehicle,
                        activeVehicle.x + cosA * halfL,
                        activeVehicle.y + sinA * halfL,
                        50 * 4.4444,
                        0,
                        {} as any,
                        1400,
                        true,
                        6.4
                      );
                      setSimTick(t => t + 1);
                    }}
                    className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Лобовой в столб (50 км/ч)
                  </button>

                  <button
                    onClick={() => {
                      if (!activeVehicle) return;
                      const cosA = Math.cos(activeVehicle.angle);
                      const sinA = Math.sin(activeVehicle.angle);
                      const halfW = activeVehicle.width / 2;
                      applyVehicleDamageAndDeformation(
                        activeVehicle,
                        activeVehicle.x - sinA * halfW,
                        activeVehicle.y + cosA * halfW,
                        45 * 4.4444,
                        0,
                        {} as any,
                        1400,
                        false,
                        activeVehicle.length * 0.4
                      );
                      setSimTick(t => t + 1);
                    }}
                    className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Боковой Т-бон (45 км/ч)
                  </button>

                  <button
                    onClick={() => {
                      if (!activeVehicle) return;
                      const cosA = Math.cos(activeVehicle.angle);
                      const sinA = Math.sin(activeVehicle.angle);
                      const halfL = activeVehicle.length / 2;
                      applyVehicleDamageAndDeformation(
                        activeVehicle,
                        activeVehicle.x - cosA * halfL,
                        activeVehicle.y - sinA * halfL,
                        40 * 4.4444,
                        0,
                        {} as any,
                        1400,
                        true,
                        activeVehicle.width
                      );
                      setSimTick(t => t + 1);
                    }}
                    className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
                    Задний удар (40 км/ч)
                  </button>

                  <button
                    onClick={() => {
                      if (!activeVehicle) return;
                      activeVehicle.damage.nodeBeam = createVehicleNodeBeamSystem(activeVehicle);
                      if (activeVehicle.damage.deformedVertices) {
                        for (const v of activeVehicle.damage.deformedVertices) {
                          v.offsetX = 0;
                          v.offsetY = 0;
                          v.targetOffsetX = 0;
                          v.targetOffsetY = 0;
                          v.elasticX = 0;
                          v.elasticY = 0;
                          v.velX = 0;
                          v.velY = 0;
                          v.plasticStrain = 0;
                        }
                      }
                      activeVehicle.damage.frontCrumple = 0;
                      activeVehicle.damage.rearCrumple = 0;
                      activeVehicle.damage.leftDent = 0;
                      activeVehicle.damage.rightDent = 0;
                      activeVehicle.damage.frontLeftDent = 0;
                      activeVehicle.damage.frontRightDent = 0;
                      activeVehicle.damage.rearLeftDent = 0;
                      activeVehicle.damage.rearRightDent = 0;
                      activeVehicle.damage.hoodBuckled = false;
                      activeVehicle.damage.hoodDetached = false;
                      activeVehicle.damage.frontBumperDetached = false;
                      activeVehicle.damage.rearBumperDetached = false;
                      activeVehicle.damage.bumperSagLeft = 0;
                      activeVehicle.damage.bumperSagRight = 0;
                      activeVehicle.damage.steeringDrift = 0;
                      activeVehicle.damage.frameBentAngle = 0;
                      activeVehicle.damage.wheelRubResistance = 0;
                      setSimTick(t => t + 1);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer flex items-center gap-1.5 ml-auto active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Сбросить в завод (Reset)
                  </button>
                </div>
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

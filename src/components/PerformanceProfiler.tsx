import React, { useState } from 'react';
import { 
  Cpu, 
  Sliders, 
  Download, 
  X, 
  Minimize2, 
  Maximize2, 
  VolumeX, 
  Volume2, 
  Flame, 
  Gauge, 
  Check, 
  Activity, 
  Trash2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { PerformanceConfig, DEFAULT_CONFIG, savePerformanceConfig, performanceConfig } from '../performanceConfig';

export interface PerformanceStats {
  fps: number;
  spatialGridTime: number;
  aiTrafficTime: number;
  pedestriansTime: number;
  physicsTime: number;
  viewportTime: number;
  renderTime: number;
  minimapTime: number;
  totalFrameTime: number;
  vehiclesTotal: number;
  vehiclesVisible: number;
  pedestriansTotal: number;
  pedestriansVisible: number;
  particlesTotal: number;
}

interface PerformanceProfilerProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PerformanceStats;
  history: PerformanceStats[];
  onClearHistory: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export function PerformanceProfiler({
  isOpen,
  onClose,
  stats,
  history,
  onClearHistory,
  isMuted,
  onToggleMute
}: PerformanceProfilerProps) {
  const [activeTab, setActiveTab] = useState<'charts' | 'optimize' | 'export'>('charts');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<PerformanceConfig>({ ...performanceConfig });

  if (!isOpen) return null;

  const handleConfigChange = <K extends keyof PerformanceConfig>(key: K, value: PerformanceConfig[K]) => {
    const updated = { ...localConfig, [key]: value };
    setLocalConfig(updated);
    
    // Update the live performanceConfig instance properties in-place
    Object.assign(performanceConfig, updated);
    savePerformanceConfig(updated);
  };

  const resetToDefault = () => {
    setLocalConfig({ ...DEFAULT_CONFIG });
    Object.assign(performanceConfig, DEFAULT_CONFIG);
    savePerformanceConfig(DEFAULT_CONFIG);
  };

  // Timing helper: returns colors depending on load severity
  const getSeverityColor = (ms: number, warningThreshold = 3, criticalThreshold = 6) => {
    if (ms >= criticalThreshold) return 'text-red-400 bg-red-950/40 border-red-800/50';
    if (ms >= warningThreshold) return 'text-amber-400 bg-amber-950/30 border-amber-800/40';
    return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
  };

  const getBarColor = (ms: number, warningThreshold = 3, criticalThreshold = 6) => {
    if (ms >= criticalThreshold) return 'bg-red-500';
    if (ms >= warningThreshold) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Export diagnostic data to JSON
  const exportJSON = () => {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency || 'N/A',
      currentConfiguration: localConfig,
      currentWorldStats: {
        fps: stats.fps,
        vehiclesTotal: stats.vehiclesTotal,
        vehiclesVisible: stats.vehiclesVisible,
        pedestriansTotal: stats.pedestriansTotal,
        pedestriansVisible: stats.pedestriansVisible,
        particlesTotal: stats.particlesTotal,
      },
      averageTimings: calculateAverages(),
      frameHistoryLog: history.map((h, index) => ({
        frame: index + 1,
        ...h
      }))
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `city_perf_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export diagnostic data to CSV
  const exportCSV = () => {
    if (history.length === 0) {
      alert('Нет логов для экспорта. Начните симуляцию, чтобы записать кадры.');
      return;
    }

    const headers = [
      'Кадр', 'FPS', 'Сеть_Спатиал_Грид(мс)', 'АИ_Трафик(мс)', 
      'Пешеходы(мс)', 'Физика(мс)', 'Камера_Вьюпорт(мс)', 
      'Рендер_Сцена(мс)', 'Миникарта(мс)', 'Всего_Кадр(мс)', 
      'Всего_Машин', 'Видимо_Машин', 'Всего_Пешеходов', 'Видимо_Пешеходов', 'Всего_Частиц'
    ];

    const rows = history.map((h, i) => [
      i + 1,
      h.fps,
      h.spatialGridTime.toFixed(3),
      h.aiTrafficTime.toFixed(3),
      h.pedestriansTime.toFixed(3),
      h.physicsTime.toFixed(3),
      h.viewportTime.toFixed(3),
      h.renderTime.toFixed(3),
      h.minimapTime.toFixed(3),
      h.totalFrameTime.toFixed(3),
      h.vehiclesTotal,
      h.vehiclesVisible,
      h.pedestriansTotal,
      h.pedestriansVisible,
      h.particlesTotal
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `city_perf_history_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const calculateAverages = () => {
    if (history.length === 0) return null;
    const sum = history.reduce((acc, h) => {
      acc.fps += h.fps;
      acc.spatialGrid += h.spatialGridTime;
      acc.aiTraffic += h.aiTrafficTime;
      acc.pedestrians += h.pedestriansTime;
      acc.physics += h.physicsTime;
      acc.viewport += h.viewportTime;
      acc.render += h.renderTime;
      acc.minimap += h.minimapTime;
      acc.total += h.totalFrameTime;
      return acc;
    }, {
      fps: 0, spatialGrid: 0, aiTraffic: 0, pedestrians: 0, 
      physics: 0, viewport: 0, render: 0, minimap: 0, total: 0
    });

    const len = history.length;
    return {
      avgFps: Math.round(sum.fps / len),
      avgSpatialGridMs: (sum.spatialGrid / len).toFixed(2),
      avgAiTrafficMs: (sum.aiTraffic / len).toFixed(2),
      avgPedestriansMs: (sum.pedestrians / len).toFixed(2),
      avgPhysicsMs: (sum.physics / len).toFixed(2),
      avgViewportMs: (sum.viewport / len).toFixed(2),
      avgRenderMs: (sum.render / len).toFixed(2),
      avgMinimapMs: (sum.minimap / len).toFixed(2),
      avgTotalMs: (sum.total / len).toFixed(2),
    };
  };

  const averages = calculateAverages();

  return (
    <div 
      className={`fixed bottom-4 left-4 z-[9999] bg-slate-950/95 text-slate-100 rounded-xl border border-slate-800 shadow-2xl transition-all duration-300 font-mono flex flex-col ${
        isMinimized ? 'w-80 h-12' : 'w-96 md:w-[420px] max-h-[85vh]'
      }`}
      style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}
      id="perf-profiler-panel"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 select-none cursor-pointer"
           onClick={() => setIsMinimized(!isMinimized)}>
        <div className="flex items-center gap-2">
          <Activity className={`w-5 h-5 text-indigo-400 ${stats.fps < 30 ? 'animate-pulse text-red-400' : ''}`} />
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            ПРОФАЙЛЕР НАГРУЗКИ
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border text-xs leading-none font-bold ${
            stats.fps >= 45 ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-400' :
            stats.fps >= 25 ? 'bg-amber-950/40 border-amber-800/50 text-amber-400' :
            'bg-red-950/50 border-red-800/60 text-red-400 animate-pulse'
          }`}>
            {stats.fps} FPS
          </span>
        </div>
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title={isMinimized ? "Развернуть" : "Свернуть"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
            title="Закрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BODY (ONLY SHOWN IF NOT MINIMIZED) */}
      {!isMinimized && (
        <>
          {/* TABS */}
          <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs">
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex-1 py-2 px-3 border-b-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'charts' 
                  ? 'border-indigo-500 text-indigo-400 bg-slate-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Нагрузка
            </button>
            <button
              onClick={() => setActiveTab('optimize')}
              className={`flex-1 py-2 px-3 border-b-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'optimize' 
                  ? 'border-indigo-500 text-indigo-400 bg-slate-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Оптимизация
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-2 px-3 border-b-2 font-medium transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'export' 
                  ? 'border-indigo-500 text-indigo-400 bg-slate-950/30' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Лог & Экспорт
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs select-text max-h-[50vh]">
            {/* TAB 1: CHARTS & CURRENT TIMINGS */}
            {activeTab === 'charts' && (
              <div className="space-y-4">
                {/* Latency & Hardware Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Общая задержка</span>
                    <div className="text-lg font-bold text-slate-100">
                      {stats.totalFrameTime.toFixed(1)} <span className="text-xs font-normal text-slate-400">мс/кадр</span>
                    </div>
                  </div>
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">Лимит бюджета (60 FPS)</span>
                    <div className="text-lg font-bold text-slate-100 flex items-center gap-1">
                      {stats.totalFrameTime <= 16.6 ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-sm font-bold">✓ Норма</span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 text-sm font-bold">
                          <AlertCircle className="w-4 h-4 text-red-400" /> Превышен
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* TIMING LIST AND BARS */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Распределение нагрузки CPU/GPU:</span>
                  
                  <div className="space-y-2.5 pt-1">
                    {/* Render Scene */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">1. Отрисовка сцены (Canvas)</span>
                        <span className="font-bold">{stats.renderTime.toFixed(2)} мс</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-100 ${getBarColor(stats.renderTime, 6, 12)}`} 
                          style={{ width: `${Math.min(100, (stats.renderTime / 16.6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* AI Traffic Update */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">2. Симуляция ИИ Машин</span>
                        <span className="font-bold">{stats.aiTrafficTime.toFixed(2)} мс</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-100 ${getBarColor(stats.aiTrafficTime, 3, 6)}`} 
                          style={{ width: `${Math.min(100, (stats.aiTrafficTime / 16.6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Pedestrians update */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">3. Симуляция Пешеходов</span>
                        <span className="font-bold">{stats.pedestriansTime.toFixed(2)} мс</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-100 ${getBarColor(stats.pedestriansTime, 3, 6)}`} 
                          style={{ width: `${Math.min(100, (stats.pedestriansTime / 16.6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Vehicle/Player Physics */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-300 font-medium">4. Физика & Коллизии</span>
                        <span className="font-bold">{stats.physicsTime.toFixed(2)} мс</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-100 ${getBarColor(stats.physicsTime, 2, 4)}`} 
                          style={{ width: `${Math.min(100, (stats.physicsTime / 16.6) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Minimap rendering */}
                    {localConfig.enableMinimap && (
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-300 font-medium">5. Отрисовка миникарты</span>
                          <span className="font-bold">{stats.minimapTime.toFixed(2)} мс</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-850 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-100 ${getBarColor(stats.minimapTime, 2, 4)}`} 
                            style={{ width: `${Math.min(100, (stats.minimapTime / 16.6) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Spatial Grids */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Вспомогательные сетки (SpatialGrid)</span>
                        <span className="font-bold text-slate-300">{stats.spatialGridTime.toFixed(2)} мс</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ENTITIES COUNT */}
                <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800 text-slate-300 space-y-1.5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-1 font-semibold">Активные объекты в сцене:</div>
                  <div className="flex justify-between">
                    <span>Автомобили:</span>
                    <span className="font-bold text-slate-100">{stats.vehiclesVisible} / {stats.vehiclesTotal} <span className="font-normal text-[10px] text-slate-400">(в кадре/всего)</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Пешеходы:</span>
                    <span className="font-bold text-slate-100">{stats.pedestriansVisible} / {stats.pedestriansTotal} <span className="font-normal text-[10px] text-slate-400">(в кадре/всего)</span></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Частицы (Дым/Огонь):</span>
                    <span className="font-bold text-slate-100">{stats.particlesTotal} <span className="font-normal text-[10px] text-slate-400">(макс {localConfig.particleLimit})</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: OPTIMIZATIONS (SLIDERS & TOGGLES) */}
            {activeTab === 'optimize' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900/50 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="font-semibold text-slate-200">Быстрая Оптимизация</span>
                  </div>
                  <button 
                    onClick={resetToDefault}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 hover:text-slate-100 text-slate-300 rounded text-[10px] font-bold transition-all"
                  >
                    Сбросить
                  </button>
                </div>

                <div className="space-y-3.5">
                  {/* Traffic count slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">Макс. количество ИИ машин:</span>
                      <span className="font-bold text-indigo-400">{localConfig.maxVehicles}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="80" 
                      step="1"
                      value={localConfig.maxVehicles} 
                      onChange={(e) => handleConfigChange('maxVehicles', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">Уменьшение убирает лишние автомобили и снижает нагрузку на симуляцию.</div>
                  </div>

                  {/* Pedestrians count slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium">Макс. количество пешеходов:</span>
                      <span className="font-bold text-indigo-400">{localConfig.maxActivePedestrians}</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="250" 
                      step="5"
                      value={localConfig.maxActivePedestrians} 
                      onChange={(e) => handleConfigChange('maxActivePedestrians', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-400">Ограничивает количество активных пешеходов в игре.</div>
                  </div>

                  {/* Particles Limit slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-300 font-medium font-bold">Лимит частиц дыма/пыли/искр:</span>
                      <span className="font-bold text-indigo-400">{localConfig.particleLimit}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="1000" 
                      step="50"
                      value={localConfig.particleLimit} 
                      onChange={(e) => handleConfigChange('particleLimit', parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="h-px bg-slate-800 my-2" />

                  {/* TOGGLES GRID */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Minimap toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900/30 p-2 rounded-lg border border-slate-850 hover:bg-slate-900/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={localConfig.enableMinimap}
                        onChange={(e) => handleConfigChange('enableMinimap', e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-[11px] text-slate-200">Миникарта</div>
                        <div className="text-[9px] text-slate-400">Экономия до 15% FPS</div>
                      </div>
                    </label>

                    {/* Shadows toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900/30 p-2 rounded-lg border border-slate-850 hover:bg-slate-900/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={localConfig.enableShadows}
                        onChange={(e) => handleConfigChange('enableShadows', e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-[11px] text-slate-200">Тени</div>
                        <div className="text-[9px] text-slate-400">Убирает тени зданий</div>
                      </div>
                    </label>

                    {/* Rain Droplets toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900/30 p-2 rounded-lg border border-slate-850 hover:bg-slate-900/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={localConfig.enableRainDroplets}
                        onChange={(e) => handleConfigChange('enableRainDroplets', e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-[11px] text-slate-200">Эффекты дождя</div>
                        <div className="text-[9px] text-slate-400">Капли/разводы на воде</div>
                      </div>
                    </label>

                    {/* Balconies toggle */}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900/30 p-2 rounded-lg border border-slate-850 hover:bg-slate-900/50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={localConfig.enableBalconyDetails}
                        onChange={(e) => handleConfigChange('enableBalconyDetails', e.target.checked)}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-[11px] text-slate-200">Детали фасадов</div>
                        <div className="text-[9px] text-slate-400">Балконы и лестницы</div>
                      </div>
                    </label>
                  </div>

                  {/* LOW QUALITY RENDERING TOGGLE */}
                  <label className="flex items-center gap-2 cursor-pointer bg-red-950/20 p-2.5 rounded-lg border border-red-900/40 hover:bg-red-950/35 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={localConfig.lowQualityRendering}
                      onChange={(e) => handleConfigChange('lowQualityRendering', e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-[11px] text-red-400">Упрощенный Рендеринг (Макс. FPS)</div>
                      <div className="text-[9px] text-red-400/80">Отключает кондиционеры на крышах, вертолетные площадки и сложный декор зданий.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 3: EXPORT DIAGNOSTICS REPORT */}
            {activeTab === 'export' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold block">Сводная статистика (Средняя):</span>
                  
                  {averages ? (
                    <div className="space-y-1.5 text-slate-300">
                      <div className="flex justify-between">
                        <span>Кадров записано:</span>
                        <span className="font-bold text-slate-100">{history.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Средний FPS:</span>
                        <span className={`font-bold ${
                          averages.avgFps >= 45 ? 'text-emerald-400' :
                          averages.avgFps >= 25 ? 'text-amber-400' :
                          'text-red-400'
                        }`}>{averages.avgFps} FPS</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ср. время кадра:</span>
                        <span className="font-bold text-slate-100">{averages.avgTotalMs} мс</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ср. ИИ автомобилей:</span>
                        <span className="font-bold text-slate-100">{averages.avgAiTrafficMs} мс</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ср. рендеринг:</span>
                        <span className="font-bold text-slate-100">{averages.avgRenderMs} мс</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-center py-2">Сбор данных еще не начался...</div>
                  )}
                </div>

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={exportJSON}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center hover:scale-[1.02]"
                  >
                    <Download className="w-5 h-5" />
                    <span>Скачать JSON</span>
                    <span className="text-[9px] font-normal text-indigo-200">Полный отчет и конфиг</span>
                  </button>
                  <button 
                    onClick={exportCSV}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold p-3 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all text-center hover:scale-[1.02]"
                  >
                    <Activity className="w-5 h-5" />
                    <span>Скачать CSV лог</span>
                    <span className="text-[9px] font-normal text-emerald-200">Таблица для Excel</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={onClearHistory}
                    className="flex-1 border border-slate-800 hover:bg-slate-900 hover:text-slate-100 text-slate-400 p-2 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Очистить лог кадров
                  </button>
                  
                  <button 
                    onClick={onToggleMute}
                    className="border border-slate-800 hover:bg-slate-900 hover:text-slate-100 text-slate-400 p-2 rounded-lg flex items-center justify-center gap-1.5 transition-all px-3"
                    title={isMuted ? "Включить звук" : "Выключить звук (Снизит нагрузку Audio)"}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="bg-slate-900/20 p-2.5 rounded border border-slate-800/40 text-[9px] text-slate-400">
                  <span className="font-bold text-slate-300">💡 Совет по лагам:</span> Больше всего на частоту кадров влияет отрисовка огромного количества зданий и миникарта. Включите <span className="text-red-400 font-bold">Упрощенный Рендеринг</span> и выключите <span className="text-indigo-400 font-bold">Миникарту</span> для мгновенного прироста производительности!
                </div>
              </div>
            )}
          </div>
          
          {/* FOOTER */}
          <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-850 text-[10px] text-slate-400 flex justify-between select-none items-center">
            <span>Лог: {history.length} кадров</span>
            <span>Горячая клавиша: <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700 font-bold text-[9px]">~</kbd></span>
          </div>
        </>
      )}
    </div>
  );
}

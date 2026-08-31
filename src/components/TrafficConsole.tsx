import React, { useState, useEffect } from 'react';
import { GameWorld, Vehicle } from '../types';
import { 
  trafficDiagnostics, 
  TrafficLogEntry, 
  flushCityGridlocks, 
  respawnStalledVehicles 
} from '../aiTraffic';
import { 
  Activity, 
  AlertOctagon, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Copy, 
  Download, 
  Eye, 
  EyeOff, 
  FileText, 
  Layers, 
  Maximize2, 
  Radio, 
  RefreshCw, 
  Terminal, 
  Trash2, 
  X, 
  Zap 
} from 'lucide-react';

interface TrafficConsoleProps {
  world: GameWorld | null;
  isOpen: boolean;
  onClose: () => void;
  onFocusVehicle: (vehicle: Vehicle) => void;
}

export const TrafficConsole: React.FC<TrafficConsoleProps> = ({
  world,
  isOpen,
  onClose,
  onFocusVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicles' | 'intersections' | 'logs'>('overview');
  const [logs, setLogs] = useState<TrafficLogEntry[]>([]);
  const [debugOverlay, setDebugOverlay] = useState<boolean>(trafficDiagnostics.debugOverlayEnabled);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tick, setTick] = useState<number>(0);
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);

  // Poll state every 300ms for live telemetry update
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setLogs([...trafficDiagnostics.logs]);
      setTick((t) => t + 1);
    }, 300);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !world) return null;

  const vehicles = world.vehicles.filter((v) => !v.isPlayerControlled);
  const stalledCars = vehicles.filter((v) => v.speed < 4 && v.aiState !== 'stopping_light');
  const reversingCars = vehicles.filter((v) => v.aiState === 'reversing');
  const avgSpeed = Math.round(trafficDiagnostics.averageSpeed);
  const gridlockCount = stalledCars.length;

  const toggleDebugOverlay = () => {
    const next = !debugOverlay;
    trafficDiagnostics.debugOverlayEnabled = next;
    setDebugOverlay(next);
  };

  const handleFlush = () => {
    flushCityGridlocks(world);
    setTick((t) => t + 1);
  };

  const handleRespawn = () => {
    respawnStalledVehicles(world);
    setTick((t) => t + 1);
  };

  const handleClearLogs = () => {
    trafficDiagnostics.clearLogs();
    setLogs([]);
  };

  // Generate full text summary of logs
  const getLogsText = () => {
    const header = `=== TRAFFIC AI DECISION LOGS (${logs.length} entries) ===\nExported at: ${new Date().toISOString()}\n\n`;
    const body = logs
      .map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message}`)
      .join('\n');
    return header + (body || '(No logs recorded)');
  };

  // Generate comprehensive JSON snapshot of the entire traffic system
  const getFullDiagnosticSnapshot = () => {
    return {
      timestamp: new Date().toISOString(),
      cityStats: {
        totalVehicles: vehicles.length,
        stalledVehicles: stalledCars.length,
        reversingVehicles: reversingCars.length,
        averageSpeedKmh: avgSpeed,
        completedTurns: trafficDiagnostics.totalPassedThrough,
        gridlockCount: trafficDiagnostics.gridlockCount,
      },
      vehicles: vehicles.map((v) => ({
        id: v.id,
        type: v.type,
        aiState: v.aiState,
        speedKmh: Math.round(v.speed * 0.36),
        targetSpeedKmh: Math.round(v.targetSpeed * 0.36),
        position: { x: Math.round(v.x), y: Math.round(v.y) },
        headingDeg: Math.round((v.angle * 180) / Math.PI),
        stuckTimer: parseFloat(v.stuckTimer.toFixed(2)),
        inIntersection: v.inIntersection,
        plannedTurn: v.plannedTurn,
        currentLaneId: v.currentLaneId,
      })),
      intersections: world.intersections.map((i) => ({
        id: i.id,
        type: i.type,
        currentPhaseIndex: i.currentPhaseIndex,
        phaseTimer: parseFloat(i.phaseTimer.toFixed(2)),
        nsLight: i.phases[i.currentPhaseIndex]?.nsState,
        ewLight: i.phases[i.currentPhaseIndex]?.ewState,
      })),
      logs: logs,
    };
  };

  // Copy logs as text to clipboard
  const handleCopyLogs = async () => {
    try {
      const text = getLogsText();
      await navigator.clipboard.writeText(text);
      setCopiedStatus('logs');
      setTimeout(() => setCopiedStatus(null), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Copy full JSON diagnostic snapshot to clipboard
  const handleCopySnapshot = async () => {
    try {
      const snapshot = JSON.stringify(getFullDiagnosticSnapshot(), null, 2);
      await navigator.clipboard.writeText(snapshot);
      setCopiedStatus('snapshot');
      setTimeout(() => setCopiedStatus(null), 2500);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  // Download log text file (.txt)
  const handleDownloadLogsTxt = () => {
    const text = getLogsText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traffic-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download full JSON dump (.json)
  const handleDownloadSnapshotJson = () => {
    const json = JSON.stringify(getFullDiagnosticSnapshot(), null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `traffic-diagnostics-full-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredVehicles = vehicles.filter((v) => 
    v.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.aiState.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="traffic-telemetry-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-xs">
        
        {/* TOP BAR */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-wider text-slate-100 uppercase">Urban Traffic AI Diagnostics</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-sans">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE TELEMETRY
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans">Autonomous path tracking, deadlock arbitration & intersection telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-sans">
            <button
              id="btn-toggle-ai-debug-overlay"
              onClick={toggleDebugOverlay}
              className={`px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all text-xs ${
                debugOverlay 
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {debugOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {debugOverlay ? 'AI Rays: ON' : 'AI Rays: OFF'}
            </button>

            <button
              id="btn-close-traffic-console"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
              title="Close Console (Esc / ~)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-900/60 border-b border-slate-800 font-sans">
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Average City Speed</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">{avgSpeed} <span className="text-xs font-normal text-slate-400">km/h</span></div>
            </div>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Fleet Active / Stalled</div>
              <div className="text-base font-bold text-slate-100 mt-0.5">
                {vehicles.length} <span className="text-xs font-normal text-slate-400">({stalledCars.length} idle)</span>
              </div>
            </div>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Completed Turns</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">{trafficDiagnostics.totalPassedThrough}</div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400">Flow Health</div>
              <div className={`text-base font-bold mt-0.5 flex items-center gap-1 ${
                gridlockCount === 0 ? 'text-emerald-400' : gridlockCount < 3 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {gridlockCount === 0 ? 'Optimal' : gridlockCount < 3 ? 'Caution' : 'Congested'}
              </div>
            </div>
            <AlertOctagon className={`w-4 h-4 ${gridlockCount === 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
          </div>
        </div>

        {/* NAVIGATION TABS & ACTIONS */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950/40 border-b border-slate-800 font-sans">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Overview & Controls
            </button>
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'vehicles' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Vehicles Telemetry ({vehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('intersections')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeTab === 'intersections' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Intersections ({world.intersections.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                activeTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Decision Logs ({logs.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-flush-gridlocks"
              onClick={handleFlush}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 font-medium transition text-xs"
              title="Release stopped vehicles immediately"
            >
              <Zap className="w-3 h-3" /> Flush Gridlocks
            </button>
            <button
              id="btn-respawn-traffic"
              onClick={handleRespawn}
              className="px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-medium transition text-xs"
              title="Redistribute blocked cars to open avenues"
            >
              <RefreshCw className="w-3 h-3" /> Respawn Stalled
            </button>
          </div>
        </div>

        {/* TAB BODY */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900/40">
          
          {/* TAB 1: OVERVIEW & CONTROLS */}
          {activeTab === 'overview' && (
            <div className="space-y-4 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* AI Controller Status Card */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">AI Steering & Physics Engine</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      Pure Pursuit Active
                    </span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Dynamic Lookahead:</strong> 38px–85px lookahead polyline curvature prevents any oscillations or snaking.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Don't Block the Box:</strong> Vehicles proactively check target exit lanes before crossing green stop-lines.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span><strong>Anti-Deadlock Resolver:</strong> Autonomous reverse escape maneuver executes if stalled &gt; 2.2s.</span>
                    </li>
                  </ul>
                </div>

                {/* Gridlock & Safety Status */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Deadlock Diagnostics</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Stalled Cars</div>
                      <div className={`text-base font-bold font-mono ${stalledCars.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {stalledCars.length}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">Reversing</div>
                      <div className="text-base font-bold font-mono text-purple-400">
                        {reversingCars.length}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[10px]">In Intersection</div>
                      <div className="text-base font-bold font-mono text-blue-400">
                        {vehicles.filter((v) => v.inIntersection).length}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">~</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300 font-mono">F1</kbd> at any time to toggle this telemetry panel.
                  </p>
                </div>
              </div>

              {/* Recent Decision Logs preview */}
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Live Decision Stream</span>
                  <button onClick={() => setActiveTab('logs')} className="text-xs text-indigo-400 hover:text-indigo-300">
                    View all logs &rarr;
                  </button>
                </div>
                <div className="space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto">
                  {logs.slice(0, 6).map((log) => (
                    <div key={log.id} className="flex items-center gap-2 text-slate-300 py-0.5">
                      <span className="text-slate-500">{log.timestamp}</span>
                      <span className={`px-1.5 py-0.2 rounded uppercase text-[9px] font-bold ${
                        log.type === 'deadlock' ? 'bg-rose-500/20 text-rose-400' :
                        log.type === 'light' ? 'bg-amber-500/20 text-amber-400' :
                        log.type === 'yield' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {log.type}
                      </span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-slate-500 italic py-2">No decision events recorded yet. Traffic is cruising smoothly.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE FLEET TABLE */}
          {activeTab === 'vehicles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  placeholder="Filter by ID, Type (sedan, sports, etc), or State..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-500 text-xs w-72 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-slate-400 text-xs font-sans">Showing {filteredVehicles.length} of {vehicles.length} vehicles</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-semibold text-[11px]">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">State</th>
                      <th className="p-2.5">Speed</th>
                      <th className="p-2.5">Target</th>
                      <th className="p-2.5">Stuck Timer</th>
                      <th className="p-2.5">Turn / Junction</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {filteredVehicles.map((car) => {
                      const speedKmh = Math.round(car.speed * 0.36);
                      const targetKmh = Math.round(car.targetSpeed * 0.36);
                      const isStalled = car.speed < 4 && car.aiState !== 'stopping_light';

                      return (
                        <tr key={car.id} className="hover:bg-slate-900/80 transition">
                          <td className="p-2.5 font-bold text-slate-200">#{car.id.slice(-4)}</td>
                          <td className="p-2.5 text-slate-300 capitalize">{car.type}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              car.aiState === 'driving' ? 'bg-emerald-500/20 text-emerald-400' :
                              car.aiState === 'stopping_light' ? 'bg-rose-500/20 text-rose-400' :
                              car.aiState === 'yielding' ? 'bg-amber-500/20 text-amber-400' :
                              car.aiState === 'reversing' ? 'bg-purple-500/20 text-purple-400' :
                              car.aiState === 'stopping_obstacle' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {car.aiState}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={speedKmh === 0 ? 'text-slate-500' : 'text-slate-200'}>
                              {speedKmh} km/h
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-400">{targetKmh} km/h</td>
                          <td className="p-2.5">
                            <span className={isStalled ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                              {car.stuckTimer.toFixed(1)}s
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-300">
                            {car.inIntersection ? 'In Box' : car.plannedTurn}
                          </td>
                          <td className="p-2.5 text-right font-sans">
                            <button
                              onClick={() => onFocusVehicle(car)}
                              className="px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] transition"
                            >
                              Focus Cam
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INTERSECTIONS MONITOR */}
          {activeTab === 'intersections' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {world.intersections.map((inter) => {
                const currentPhase = inter.phases[inter.currentPhaseIndex];
                const carsInside = vehicles.filter((v) => {
                  const halfW = inter.width / 2 + 10;
                  const halfH = inter.height / 2 + 10;
                  return v.x >= inter.x - halfW && v.x <= inter.x + halfW && v.y >= inter.y - halfH && v.y <= inter.y + halfH;
                });

                return (
                  <div key={inter.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-100 uppercase">{inter.id} ({inter.type})</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        carsInside.length > 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {carsInside.length} cars in junction
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">North-South Signal</div>
                        <div className={`font-bold font-mono capitalize ${
                          currentPhase?.nsState === 'green' || currentPhase?.nsState === 'green_flashing' ? 'text-emerald-400' :
                          currentPhase?.nsState === 'yellow' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {currentPhase?.nsState}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <div className="text-slate-400 text-[10px]">East-West Signal</div>
                        <div className={`font-bold font-mono capitalize ${
                          currentPhase?.ewState === 'green' || currentPhase?.ewState === 'green_flashing' ? 'text-emerald-400' :
                          currentPhase?.ewState === 'yellow' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {currentPhase?.ewState}
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Phase time: {inter.phaseTimer.toFixed(1)}s / {currentPhase?.duration}s</span>
                      <span>Stop lines: {inter.stopLines.length}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 4: DECISION LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3 font-sans">
              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-semibold">Экспорт & Диагностика:</span>
                  <span className="text-xs text-slate-500 font-mono">({logs.length} событий)</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    id="btn-copy-logs"
                    onClick={handleCopyLogs}
                    className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-xs flex items-center gap-1.5 transition font-medium"
                    title="Скопировать только текст логов"
                  >
                    {copiedStatus === 'logs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedStatus === 'logs' ? 'Скопировано!' : 'Скопировать Логи'}
                  </button>

                  <button
                    id="btn-copy-snapshot"
                    onClick={handleCopySnapshot}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs flex items-center gap-1.5 transition font-medium"
                    title="Скопировать полный JSON дамп (машины + светофоры + логи)"
                  >
                    {copiedStatus === 'snapshot' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5" />}
                    {copiedStatus === 'snapshot' ? 'Дамп скопирован!' : 'Скопировать JSON Дамп'}
                  </button>

                  <button
                    id="btn-download-logs-txt"
                    onClick={handleDownloadLogsTxt}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition font-medium"
                    title="Скачать файл logs.txt"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Скачать .TXT
                  </button>

                  <button
                    id="btn-download-snapshot-json"
                    onClick={handleDownloadSnapshotJson}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs flex items-center gap-1.5 transition font-medium"
                    title="Скачать полный файл diagnostics.json"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Скачать .JSON
                  </button>

                  <button
                    id="btn-clear-logs"
                    onClick={handleClearLogs}
                    className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center gap-1 transition"
                    title="Очистить буфер"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Logs Stream */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-1.5 font-mono text-[11px] max-h-[50vh] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 text-slate-300 py-0.5 border-b border-slate-900/60 pb-1">
                    <span className="text-slate-500 shrink-0">{log.timestamp}</span>
                    <span className={`px-1.5 py-0.2 rounded uppercase text-[9px] font-bold shrink-0 ${
                      log.type === 'deadlock' ? 'bg-rose-500/20 text-rose-400' :
                      log.type === 'light' ? 'bg-amber-500/20 text-amber-400' :
                      log.type === 'yield' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {log.type}
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-slate-500 italic py-4 text-center">Нет записанных событий. Трафик движется штатно.</div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM STATUS BAR */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-sans">
          <span>AI Navigation: <strong>Pure Pursuit Polyline</strong> (Lookahead 38–85px, Damping: Critical)</span>
          <span className="text-slate-500">Shortcut: Toggle with <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">~</kbd> or <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">F1</kbd></span>
        </div>

      </div>
    </div>
  );
};

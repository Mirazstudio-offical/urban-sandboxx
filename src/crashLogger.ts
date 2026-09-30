/**
 * CrashLogger & Blackbox Flight Recorder
 * High-reliability telemetry, memory watchdog, and error logging subsystem.
 * Intercepts unhandled errors, memory exhaustion warnings, and unexpected tab reloads.
 */

export interface LogEntry {
  id: number;
  timestamp: string;
  timeMs: number;
  level: 'error' | 'warn' | 'info' | 'memory' | 'heartbeat' | 'lifecycle';
  category: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
}

export interface TelemetrySnapshot {
  timestamp: string;
  timeMs: number;
  fps: number;
  playerPos: { x: number; y: number; inVehicle: boolean; vehicleId: string | null; floor: number };
  entities: {
    vehicles: number;
    pedestrians: number;
    particles: number;
    skidMarks: number;
    stains: number;
    groundItems: number;
  };
  memory?: {
    usedJSHeapSizeMB?: number;
    totalJSHeapSizeMB?: number;
    jsHeapSizeLimitMB?: number;
    memoryPressureRatio?: number;
  };
  audioState?: {
    state: string;
    engineRunning: boolean;
  };
  activeModals?: string[];
}

export interface CrashReport {
  id: string;
  crashTime: string;
  crashTimeMs: number;
  reason: string;
  errorDetails?: {
    message: string;
    stack?: string;
    source?: string;
    lineno?: number;
    colno?: number;
  };
  lastSnapshot?: TelemetrySnapshot;
  recentLogs: LogEntry[];
  userAgent: string;
  screenSize: { width: number; height: number; devicePixelRatio: number };
  uptimeSeconds: number;
}

const STORAGE_KEY_CRASH_LOGS = 'neon_city_crash_history_v1';
const STORAGE_KEY_HEARTBEAT = 'neon_city_heartbeat_watchdog_v1';
const STORAGE_KEY_BLACKBOX = 'neon_city_blackbox_last_snapshot_v1';
const MAX_IN_MEMORY_LOGS = 300;
const MAX_PERSISTENT_CRASHES = 10;

class CrashLogger {
  private logs: LogEntry[] = [];
  private nextLogId: number = 1;
  private startTime: number = Date.now();
  private lastSnapshot: TelemetrySnapshot | null = null;
  private isCleanShutdown: boolean = false;
  private heartbeatIntervalId: number | null = null;
  private listeners: ((log: LogEntry) => void)[] = [];
  private previousCrashDetected: CrashReport | null = null;

  constructor() {
    this.initWatchdog();
    this.hookGlobalErrorHandlers();
  }

  private hookGlobalErrorHandlers() {
    if (typeof window === 'undefined') return;

    // Window Error Handler
    window.addEventListener('error', (event: ErrorEvent) => {
      const err = event.error;
      const stack = err?.stack || `at ${event.filename}:${event.lineno}:${event.colno}`;
      this.recordError('UnhandledError', event.message || 'Unknown window error', stack, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
      this.saveCrashSnapshot('UNHANDLED_WINDOW_ERROR', {
        message: event.message,
        stack,
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled Promise Rejection Handler
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let msg = 'Unhandled Promise Rejection';
      let stack = '';
      if (reason instanceof Error) {
        msg = reason.message;
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        msg = reason;
      } else {
        try {
          msg = JSON.stringify(reason);
        } catch {
          msg = String(reason);
        }
      }
      this.recordError('PromiseRejection', msg, stack);
      this.saveCrashSnapshot('UNHANDLED_PROMISE_REJECTION', { message: msg, stack });
    });

    // Clean exit markers
    const markCleanShutdown = () => {
      this.isCleanShutdown = true;
      try {
        sessionStorage.setItem(STORAGE_KEY_HEARTBEAT, JSON.stringify({
          clean: true,
          timestamp: Date.now(),
          uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
        }));
      } catch {}
    };

    window.addEventListener('beforeunload', () => {
      this.log('lifecycle', 'Application', 'Normal session termination (beforeunload)');
      markCleanShutdown();
    });

    window.addEventListener('pagehide', () => {
      markCleanShutdown();
    });

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          markCleanShutdown();
        } else if (document.visibilityState === 'visible') {
          this.isCleanShutdown = false;
        }
      });
    }

    // Intercept console.error to blackbox
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      originalConsoleError.apply(console, args);
      const text = args.map(a => (a instanceof Error ? `${a.message}\n${a.stack}` : (typeof a === 'object' ? JSON.stringify(a) : String(a)))).join(' ');
      this.log('error', 'ConsoleError', text);
    };

    const originalConsoleWarn = console.warn;
    console.warn = (...args: any[]) => {
      originalConsoleWarn.apply(console, args);
      const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      this.log('warn', 'ConsoleWarn', text);
    };
  }

  private initWatchdog() {
    if (typeof window === 'undefined') return;

    // Check if previous session crashed abnormally (heartbeat existed without clean shutdown marker)
    try {
      const rawHeartbeat = sessionStorage.getItem(STORAGE_KEY_HEARTBEAT);
      if (rawHeartbeat) {
        const hb = JSON.parse(rawHeartbeat);
        
        const hasExplicitError = !!hb.lastError && (typeof hb.lastError === 'string' ? hb.lastError.length > 0 : !!hb.lastError.message);
        const hasExplicitCrashReason = !!hb.lastReason && hb.lastReason !== 'ABNORMAL_BROWSER_RELOAD_OR_OUT_OF_MEMORY';
        const hasCriticalMemoryPressure = !!(hb.memory?.memoryPressureRatio && hb.memory.memoryPressureRatio > 0.85);

        // A true crash occurs only if there is an explicit unhandled error or genuine memory exhaustion
        const isRealCrash = !hb.clean && (hasExplicitError || hasExplicitCrashReason || hasCriticalMemoryPressure);

        if (isRealCrash) {
          const rawLastBlackbox = sessionStorage.getItem(STORAGE_KEY_BLACKBOX);
          const lastSnapshot = rawLastBlackbox ? JSON.parse(rawLastBlackbox) : undefined;
          
          const report: CrashReport = {
            id: `crash_${hb.timestamp || Date.now()}`,
            crashTime: new Date(hb.timestamp || Date.now()).toISOString(),
            crashTimeMs: hb.timestamp || Date.now(),
            reason: hb.lastReason || (hasCriticalMemoryPressure ? 'MEMORY_EXHAUSTION_OUT_OF_HEAP' : 'UNEXPECTED_ENGINE_HALT'),
            errorDetails: hb.lastError,
            lastSnapshot: lastSnapshot || hb.lastSnapshot,
            recentLogs: hb.recentLogs || [],
            userAgent: navigator.userAgent,
            screenSize: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio || 1 },
            uptimeSeconds: hb.uptimeSeconds || 0
          };

          this.previousCrashDetected = report;
          this.persistCrashReport(report);
          console.warn('[CrashLogger] Detected abnormal crash from previous session:', report);
        } else {
          // Normal browser reload, tab refresh, or clean navigation
          if (hb.uptimeSeconds && hb.uptimeSeconds > 0) {
            this.log('lifecycle', 'AppStart', `Previous session restored cleanly (uptime: ${hb.uptimeSeconds}s)`);
          }
        }
      }
    } catch (e) {
      console.warn('[CrashLogger] Failed to parse previous heartbeat:', e);
    }

    // Set initial heartbeat for current session
    this.writeHeartbeat();

    // Heartbeat ticker (runs every 1000ms)
    this.heartbeatIntervalId = window.setInterval(() => {
      this.writeHeartbeat();
    }, 1000);
  }

  private writeHeartbeat() {
    if (typeof window === 'undefined' || this.isCleanShutdown) return;
    try {
      const mem = this.getMemoryInfo();
      const payload = {
        clean: false,
        timestamp: Date.now(),
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
        lastSnapshot: this.lastSnapshot,
        memory: mem,
        recentLogs: this.logs.slice(0, 20)
      };
      sessionStorage.setItem(STORAGE_KEY_HEARTBEAT, JSON.stringify(payload));
    } catch {}
  }

  public getMemoryInfo() {
    if (typeof window !== 'undefined' && (performance as any)?.memory) {
      const pMem = (performance as any).memory;
      const usedMB = Math.round(pMem.usedJSHeapSize / (1024 * 1024) * 10) / 10;
      const totalMB = Math.round(pMem.totalJSHeapSize / (1024 * 1024) * 10) / 10;
      const limitMB = Math.round(pMem.jsHeapSizeLimit / (1024 * 1024) * 10) / 10;
      const pressure = limitMB > 0 ? Math.round((usedMB / limitMB) * 100) / 100 : 0;
      return {
        usedJSHeapSizeMB: usedMB,
        totalJSHeapSizeMB: totalMB,
        jsHeapSizeLimitMB: limitMB,
        memoryPressureRatio: pressure
      };
    }
    return undefined;
  }

  public log(
    level: LogEntry['level'],
    category: string,
    message: string,
    metadata?: Record<string, any>,
    stack?: string
  ) {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    const entry: LogEntry = {
      id: this.nextLogId++,
      timestamp: ts,
      timeMs: Date.now(),
      level,
      category,
      message,
      stack,
      metadata
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_IN_MEMORY_LOGS) {
      this.logs.pop();
    }

    // Notify listeners
    this.listeners.forEach(fn => {
      try { fn(entry); } catch {}
    });

    if (level === 'error') {
      this.writeHeartbeat();
    }
  }

  public recordError(category: string, message: string, stack?: string, metadata?: Record<string, any>) {
    this.log('error', category, message, metadata, stack);
  }

  public recordWarn(category: string, message: string, metadata?: Record<string, any>) {
    this.log('warn', category, message, metadata);
  }

  public recordInfo(category: string, message: string, metadata?: Record<string, any>) {
    this.log('info', category, message, metadata);
  }

  public recordTelemetry(snapshot: Omit<TelemetrySnapshot, 'timestamp' | 'timeMs' | 'memory'>) {
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const mem = this.getMemoryInfo();

    const fullSnapshot: TelemetrySnapshot = {
      ...snapshot,
      timestamp: ts,
      timeMs: Date.now(),
      memory: mem
    };

    this.lastSnapshot = fullSnapshot;

    // Check memory pressure warning (> 75% heap limit)
    if (mem && mem.memoryPressureRatio && mem.memoryPressureRatio > 0.75) {
      this.log('memory', 'MemoryPressure', `High JS Heap utilization: ${mem.usedJSHeapSizeMB} MB / ${mem.jsHeapSizeLimitMB} MB (${Math.round(mem.memoryPressureRatio * 100)}%)`, mem);
    }

    // Periodically cache snapshot to session storage
    if (Math.random() < 0.1) {
      try {
        sessionStorage.setItem(STORAGE_KEY_BLACKBOX, JSON.stringify(fullSnapshot));
      } catch {}
    }
  }

  public saveCrashSnapshot(reason: string, errorDetails?: CrashReport['errorDetails']) {
    try {
      const report: CrashReport = {
        id: `crash_${Date.now()}`,
        crashTime: new Date().toISOString(),
        crashTimeMs: Date.now(),
        reason,
        errorDetails,
        lastSnapshot: this.lastSnapshot || undefined,
        recentLogs: this.logs.slice(0, 30),
        userAgent: navigator.userAgent,
        screenSize: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio || 1 },
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
      };

      this.persistCrashReport(report);

      // Also update heartbeat immediately
      sessionStorage.setItem(STORAGE_KEY_HEARTBEAT, JSON.stringify({
        clean: false,
        timestamp: Date.now(),
        lastReason: reason,
        lastError: errorDetails,
        lastSnapshot: this.lastSnapshot,
        recentLogs: this.logs.slice(0, 20),
        uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
      }));
    } catch {}
  }

  private persistCrashReport(report: CrashReport) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CRASH_LOGS);
      const list: CrashReport[] = raw ? JSON.parse(raw) : [];
      list.unshift(report);
      if (list.length > MAX_PERSISTENT_CRASHES) {
        list.pop();
      }
      localStorage.setItem(STORAGE_KEY_CRASH_LOGS, JSON.stringify(list));
    } catch {}
  }

  public getSavedCrashReports(): CrashReport[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CRASH_LOGS);
      const list: CrashReport[] = raw ? JSON.parse(raw) : [];
      // Filter out legacy false-positive reload reports that have no errors
      const sanitized = list.filter(r => {
        if (r.reason === 'ABNORMAL_BROWSER_RELOAD_OR_OUT_OF_MEMORY' && !r.errorDetails) {
          return false;
        }
        return true;
      });
      // Keep persistent storage pruned if false positives existed
      if (sanitized.length !== list.length) {
        localStorage.setItem(STORAGE_KEY_CRASH_LOGS, JSON.stringify(sanitized));
      }
      return sanitized;
    } catch {
      return [];
    }
  }

  public clearSavedCrashReports() {
    try {
      localStorage.removeItem(STORAGE_KEY_CRASH_LOGS);
      this.previousCrashDetected = null;
    } catch {}
  }

  public getPreviousCrashDetected(): CrashReport | null {
    return this.previousCrashDetected;
  }

  public dismissPreviousCrashNotification() {
    this.previousCrashDetected = null;
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
  }

  public subscribe(listener: (log: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public exportDiagnosticJSON(): string {
    const data = {
      appVersion: '1.0.0',
      exportTimestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      screen: typeof window !== 'undefined' ? {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio
      } : {},
      memory: this.getMemoryInfo(),
      lastSnapshot: this.lastSnapshot,
      recentLogs: this.logs,
      savedCrashReports: this.getSavedCrashReports()
    };
    return JSON.stringify(data, null, 2);
  }

  public downloadDiagnosticFile() {
    if (typeof document === 'undefined') return;
    const jsonStr = this.exportDiagnosticJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neon_city_diagnostic_report_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const crashLogger = new CrashLogger();

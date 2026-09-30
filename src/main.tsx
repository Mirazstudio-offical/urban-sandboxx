import React, {StrictMode, Component, ErrorInfo, ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { RailwaySignalingSystem } from './railwaySignalingSystem';
import { crashLogger } from './crashLogger';

(window as any).RailwaySignalingSystem = RailwaySignalingSystem;
(window as any).crashLogger = crashLogger;

crashLogger.log('lifecycle', 'AppStart', 'Application initialized');

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, error: null, errorInfo: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    crashLogger.recordError('ReactErrorBoundary', error.message, error.stack, {
      componentStack: errorInfo.componentStack
    });
    crashLogger.saveCrashSnapshot('REACT_RENDER_ERROR', {
      message: error.message,
      stack: error.stack
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDownloadReport = () => {
    crashLogger.downloadDiagnosticFile();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-white select-none z-[9999]">
          <div className="max-w-lg w-full bg-slate-900 border border-rose-800/80 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-600 flex items-center justify-center text-rose-400 font-bold text-xl">
                !
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Критическая ошибка интерфейса</h1>
                <p className="text-xs text-rose-300">Событие перехвачено Blackbox ErrorBoundary</p>
              </div>
            </div>

            <div className="bg-black/60 border border-slate-800 rounded-xl p-3 font-mono text-xs text-rose-200 overflow-x-auto max-h-48">
              <div className="font-bold text-rose-400 mb-1">{this.state.error?.name}: {this.state.error?.message}</div>
              <div className="text-[10px] text-slate-400 whitespace-pre">{this.state.error?.stack}</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition cursor-pointer shadow active:scale-95"
              >
                Перезагрузить игру
              </button>
              <button
                onClick={this.handleDownloadReport}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer border border-slate-700"
              >
                Скачать отчет (.json)
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- Safe Canvas API overrides to globally prevent Uncaught IndexSizeError / DOMExceptions ---
const originalArc = CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc = function(
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  counterclockwise?: boolean
) {
  const safeRadius = radius < 0 ? 0 : (isFinite(radius) ? radius : 0);
  const safeX = isFinite(x) ? x : 0;
  const safeY = isFinite(y) ? y : 0;
  originalArc.call(this, safeX, safeY, safeRadius, startAngle, endAngle, counterclockwise);
};

const originalEllipse = CanvasRenderingContext2D.prototype.ellipse;
CanvasRenderingContext2D.prototype.ellipse = function(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  rotation: number,
  startAngle: number,
  endAngle: number,
  counterclockwise?: boolean
) {
  const safeRadiusX = radiusX < 0 ? 0 : (isFinite(radiusX) ? radiusX : 0);
  const safeRadiusY = radiusY < 0 ? 0 : (isFinite(radiusY) ? radiusY : 0);
  const safeX = isFinite(x) ? x : 0;
  const safeY = isFinite(y) ? y : 0;
  const safeRotation = isFinite(rotation) ? rotation : 0;
  originalEllipse.call(this, safeX, safeY, safeRadiusX, safeRadiusY, safeRotation, startAngle, endAngle, counterclockwise);
};

const originalCreateRadialGradient = CanvasRenderingContext2D.prototype.createRadialGradient;
CanvasRenderingContext2D.prototype.createRadialGradient = function(
  x0: number,
  y0: number,
  r0: number,
  x1: number,
  y1: number,
  r1: number
) {
  const safeR0 = r0 < 0 ? 0 : (isFinite(r0) ? r0 : 0);
  const safeR1 = r1 < 0 ? 0 : (isFinite(r1) ? r1 : 0);
  const safeX0 = isFinite(x0) ? x0 : 0;
  const safeY0 = isFinite(y0) ? y0 : 0;
  const safeX1 = isFinite(x1) ? x1 : 0;
  const safeY1 = isFinite(y1) ? y1 : 0;
  try {
    return originalCreateRadialGradient.call(this, safeX0, safeY0, safeR0, safeX1, safeY1, safeR1);
  } catch {
    const fallback = this.createLinearGradient(0, 0, 1, 1);
    fallback.addColorStop(0, 'rgba(0,0,0,0)');
    return fallback;
  }
};

if (typeof CanvasRenderingContext2D.prototype.roundRect === 'function') {
  const originalRoundRect = CanvasRenderingContext2D.prototype.roundRect;
  CanvasRenderingContext2D.prototype.roundRect = function(
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | (number | DOMPointInit)[]
  ) {
    const safeX = isFinite(x) ? x : 0;
    const safeY = isFinite(y) ? y : 0;
    const safeW = w < 0 ? 0 : (isFinite(w) ? w : 0);
    const safeH = h < 0 ? 0 : (isFinite(h) ? h : 0);
    let safeRadii: any = 0;
    if (radii !== undefined) {
      if (Array.isArray(radii)) {
        safeRadii = radii.map(r => {
          if (typeof r === 'number') {
            return r < 0 ? 0 : (isFinite(r) ? r : 0);
          }
          if (r && typeof r === 'object') {
            const nr = { ...r };
            if (typeof nr.x === 'number') nr.x = nr.x < 0 ? 0 : (isFinite(nr.x) ? nr.x : 0);
            if (typeof nr.y === 'number') nr.y = nr.y < 0 ? 0 : (isFinite(nr.y) ? nr.y : 0);
            return nr;
          }
          return r;
        });
      } else if (typeof radii === 'number') {
        safeRadii = radii < 0 ? 0 : (isFinite(radii) ? radii : 0);
      } else {
        safeRadii = radii;
      }
    }
    try {
      return originalRoundRect.call(this, safeX, safeY, safeW, safeH, safeRadii);
    } catch {
      this.rect(safeX, safeY, safeW, safeH);
    }
  };
}

// Global protection for CanvasGradient.prototype.addColorStop to prevent WebKit SyntaxError: The string did not match the expected pattern
if (typeof CanvasGradient !== 'undefined' && CanvasGradient.prototype) {
  const originalAddColorStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function(offset: number, color: string) {
    const safeOffset = offset < 0 ? 0 : offset > 1 ? 1 : (isFinite(offset) ? offset : 0);
    let safeColor = color;
    if (typeof safeColor !== 'string' || safeColor.includes('NaN') || safeColor.includes('undefined')) {
      safeColor = 'rgba(0, 0, 0, 0)';
    }
    try {
      originalAddColorStop.call(this, safeOffset, safeColor);
    } catch {
      try {
        originalAddColorStop.call(this, safeOffset, 'rgba(0, 0, 0, 0)');
      } catch {}
    }
  };
}

if (typeof CanvasRenderingContext2D.prototype.setLineDash === 'function') {
  const originalSetLineDash = CanvasRenderingContext2D.prototype.setLineDash;
  CanvasRenderingContext2D.prototype.setLineDash = function(segments: number[]) {
    if (!Array.isArray(segments)) return;
    const safeSegments = segments.map(s => (isFinite(s) && s >= 0 ? s : 0));
    try {
      originalSetLineDash.call(this, safeSegments);
    } catch {}
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
);

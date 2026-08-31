import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

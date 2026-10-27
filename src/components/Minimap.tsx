import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Minus, Plus, ZoomIn, ZoomOut, ChevronUp, Navigation } from 'lucide-react';
import type { Camera, GameWorld, Player } from '../types';
import { performanceConfig } from '../performanceConfig';
import { MAP_COLORS as C, MAP_FONT, GROUP_COLORS, formatDistance } from '../map/mapTheme';
import { collectLandmarks } from '../map/landmarks';
import {
  drawTerrain, drawRoads, drawRails, drawBuildings, drawParkings, drawSignals,
  drawRoute, drawDestination, drawTraffic, drawPedestrians, drawPlayer, drawPin, type View
} from '../map/mapDraw';
import './minimap.css';

export interface MinimapProps {
  worldRef: React.MutableRefObject<GameWorld | null>;
  playerRef: React.MutableRefObject<Player>;
  cameraRef: React.MutableRefObject<Camera>;
  streetName: string;
  /** Pauses redrawing (e.g. while the full-screen map covers everything). */
  paused?: boolean;
  onOpenMap: () => void;
  onCameraZoomIn: () => void;
  onCameraZoomOut: () => void;
  /** Receives the last draw time in ms (for the performance profiler). */
  frameTimeRef?: React.MutableRefObject<number>;
}

const RANGE_MIN = 220;
const RANGE_MAX = 1800;
const RANGE_DEFAULT = 550;

const tap = (fn: () => void) => ({
  onClick: (e: React.MouseEvent) => { e.stopPropagation(); fn(); },
  onTouchEnd: (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); fn(); },
});

export const Minimap: React.FC<MinimapProps> = ({
  worldRef, playerRef, cameraRef, streetName, paused = false, onOpenMap, onCameraZoomIn, onCameraZoomOut, frameTimeRef
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [range, setRange] = useState(RANGE_DEFAULT);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const routeRef = useRef<HTMLSpanElement | null>(null);
  const routeWrapRef = useRef<HTMLDivElement | null>(null);

  const changeRange = (f: number) => setRange(r => Math.round(Math.min(RANGE_MAX, Math.max(RANGE_MIN, r * f))));

  useEffect(() => {
    if (collapsed) return;
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let last = -Infinity;
    let lastInfo = -Infinity;
    let cssW = 0, cssH = 0, dpr = 1;

    const fit = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = frame.clientWidth; cssH = frame.clientHeight;
      const tw = Math.max(1, Math.round(cssW * dpr)), th = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== tw || canvas.height !== th) { canvas.width = tw; canvas.height = th; }
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(frame);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (pausedRef.current) return;
      if (!performanceConfig.enableMinimap) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      const every = performanceConfig.minimapUpdateMs;
      if (every > 0 && now - last < every) return;
      last = now;
      const world = worldRef.current, player = playerRef.current, camera = cameraRef.current;
      if (!world || !player || !camera || !cssW) return;
      const t0 = performance.now();

      const cx = cssW / 2, cy = cssH / 2;
      const rng = rangeRef.current;
      const scale = Math.min(cssW, cssH) / (rng * 2);
      const px = 1 / scale;
      const theta = -camera.angle - Math.PI / 2;
      const time = Date.now();

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.bgDeep;
      ctx.fillRect(0, 0, cssW, cssH);

      // world layer (rotates with the camera, player in the centre)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(theta);
      ctx.scale(scale, scale);
      ctx.translate(-player.x, -player.y);
      const reach = Math.hypot(cssW, cssH) / 2 * px + 80;
      const v: View = { minX: player.x - reach, maxX: player.x + reach, minY: player.y - reach, maxY: player.y + reach };

      drawTerrain(ctx, world, px);
      drawRoads(ctx, world, v, px, rng < 900);
      drawRails(ctx, world, v, px);
      drawParkings(ctx, world, v, px, false);
      drawBuildings(ctx, world, v, px);
      drawSignals(ctx, world, v, px);
      drawRoute(ctx, world, px, time);
      drawDestination(ctx, world, px, time);
      drawTraffic(ctx, world, v, px, time, 11);
      if (rng < 700) drawPedestrians(ctx, world, v, px);
      drawPlayer(ctx, player, px, time, true);
      ctx.restore();

      // screen layer: landmarks, off-screen destination arrow, compass
      const cos = Math.cos(theta), sin = Math.sin(theta);
      const toScreen = (x: number, y: number) => {
        const dx = x - player.x, dy = y - player.y;
        return { x: cx + (dx * cos - dy * sin) * scale, y: cy + (dx * sin + dy * cos) * scale };
      };
      const marks = collectLandmarks(world);
      for (const m of marks) {
        if (Math.abs(m.x - player.x) > reach || Math.abs(m.y - player.y) > reach) continue;
        const s = toScreen(m.x, m.y);
        if (s.x < -10 || s.y < -10 || s.x > cssW + 10 || s.y > cssH + 10) continue;
        drawPin(ctx, s.x, s.y, 6.5, GROUP_COLORS[m.group], m.iconKey, false);
      }

      const dest = world.gpsDestination;
      if (dest) {
        const s = toScreen(dest.x, dest.y);
        const pad = 12;
        if (s.x < pad || s.y < pad || s.x > cssW - pad || s.y > cssH - pad) {
          const ang = Math.atan2(s.y - cy, s.x - cx);
          const rx = cssW / 2 - pad, ry = cssH / 2 - pad;
          const k = Math.min(rx / Math.abs(Math.cos(ang) || 1e-6), ry / Math.abs(Math.sin(ang) || 1e-6));
          ctx.save();
          ctx.translate(cx + Math.cos(ang) * k, cy + Math.sin(ang) * k);
          ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath();
          ctx.fillStyle = C.amberHi; ctx.fill();
          ctx.strokeStyle = '#1a1409'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.restore();
        }
      }

      // north marker on the rim
      const nr = Math.min(cssW, cssH) / 2 - 11;
      const nx = cx + Math.sin(theta) * nr, ny = cy - Math.cos(theta) * nr;
      ctx.fillStyle = 'rgba(16,16,18,0.85)';
      ctx.beginPath(); ctx.arc(nx, ny, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.amber; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = C.amberSoft;
      ctx.font = `700 11px ${MAP_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('С', nx, ny + 0.5);

      // soft vignette
      const g = ctx.createRadialGradient(cx, cy, Math.min(cssW, cssH) * 0.32, cx, cy, Math.max(cssW, cssH) * 0.72);
      g.addColorStop(0, 'rgba(11,12,14,0)');
      g.addColorStop(1, 'rgba(11,12,14,0.55)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, cssW, cssH);

      // route readout (DOM, updated a few times per second)
      if (now - lastInfo > 250) {
        lastInfo = now;
        const wrap = routeWrapRef.current, txt = routeRef.current;
        if (wrap && txt) {
          if (dest) { wrap.style.display = 'flex'; txt.textContent = formatDistance(Math.hypot(dest.x - player.x, dest.y - player.y)); }
          else wrap.style.display = 'none';
        }
      }
      if (frameTimeRef) frameTimeRef.current = performance.now() - t0;
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [collapsed, worldRef, playerRef, cameraRef, frameTimeRef]);

  if (collapsed) {
    return (
      <div className="mm mm-collapsed">
        <button type="button" className="mm-btn mm-open" title="Показать миникарту" aria-label="Показать миникарту" {...tap(() => setCollapsed(false))}>
          <MapIcon className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mm" id="minimap-radar-container">
      <div className="mm-side">
        <button type="button" className="mm-btn" title="Приблизить камеру" aria-label="Приблизить камеру" {...tap(onCameraZoomIn)}><ZoomIn className="w-4 h-4" /></button>
        <button type="button" className="mm-btn" title="Отдалить камеру" aria-label="Отдалить камеру" {...tap(onCameraZoomOut)}><ZoomOut className="w-4 h-4" /></button>
        <span className="mm-sep" />
        <button type="button" className="mm-btn" title="Радиус карты меньше" aria-label="Радиус карты меньше" {...tap(() => changeRange(0.75))}><Plus className="w-4 h-4" /></button>
        <button type="button" className="mm-btn" title="Радиус карты больше" aria-label="Радиус карты больше" {...tap(() => changeRange(1.33))}><Minus className="w-4 h-4" /></button>
      </div>

      <div className="mm-panel">
        <div className="mm-head">
          <span className="mm-dot" />
          <span className="mm-title">Карта</span>
          <span className="mm-range">{range >= 1000 ? (range / 1000).toFixed(1) + ' км' : range + ' м'}</span>
          <button type="button" className="mm-fold" title="Свернуть миникарту" aria-label="Свернуть миникарту" {...tap(() => setCollapsed(true))}>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          ref={frameRef}
          className="mm-frame"
          role="button"
          tabIndex={0}
          title="Открыть карту на весь экран [M]"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMap(); } }}
          onWheel={(e) => changeRange(e.deltaY < 0 ? 0.88 : 1.14)}
          {...tap(onOpenMap)}
        >
          <canvas id="minimap-canvas" ref={canvasRef} />
        </div>

        <div className="mm-foot">
          <span className="mm-street" title={streetName}>{streetName}</span>
          <div ref={routeWrapRef} className="mm-route" style={{ display: 'none' }}>
            <Navigation className="w-3 h-3" />
            <span ref={routeRef} />
          </div>
          <span className="mm-key">M</span>
        </div>
      </div>
    </div>
  );
};

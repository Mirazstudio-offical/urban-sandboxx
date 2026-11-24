import React, { useEffect, useRef, useState } from 'react';
import { Map as MapIcon, Minus, Plus, ZoomIn, ZoomOut, ChevronUp, Navigation } from 'lucide-react';
import type { Camera, GameWorld, Player } from '../types';
import { performanceConfig, isMobileOrLowEndDevice } from '../performanceConfig';
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

export const Minimap: React.FC<MinimapProps> = React.memo(({
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
  const staticCacheRef = useRef<{
    canvas: HTMLCanvasElement;
    centerX: number;
    centerY: number;
    halfSpanWorld: number;
    rng: number;
    scale: number;
    dpr: number;
    worldRefObj: GameWorld | null;
  } | null>(null);
  const vignetteCacheRef = useRef<{
    w: number;
    h: number;
    gradient: CanvasGradient;
  } | null>(null);

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
      const mobile = isMobileOrLowEndDevice();
      dpr = performanceConfig.hiDpi ? Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.25) : 1;
      cssW = frame.clientWidth; cssH = frame.clientHeight;
      const tw = Math.max(1, Math.round(cssW * dpr)), th = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== tw || canvas.height !== th) {
        canvas.width = tw;
        canvas.height = th;
        vignetteCacheRef.current = null;
      }
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(frame);
    window.addEventListener('resize', fit);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (pausedRef.current || (typeof document !== 'undefined' && document.hidden)) return;
      if (!performanceConfig.enableMinimap) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
      const minEvery = isMobileOrLowEndDevice() ? 80 : 33;
      const every = Math.max(performanceConfig.minimapUpdateMs || 0, minEvery);
      if (now - last < every) return;
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

      // Regional offscreen static cache for terrain, roads, rails, parkings, and buildings
      const roamBuffer = Math.max(320, reach * 0.55);
      const cacheHalfSpan = reach + roamBuffer;
      let sCache = staticCacheRef.current;
      const needsRebuild =
        !sCache ||
        sCache.worldRefObj !== world ||
        sCache.rng !== rng ||
        sCache.dpr !== dpr ||
        Math.abs(player.x - sCache.centerX) > roamBuffer - 20 ||
        Math.abs(player.y - sCache.centerY) > roamBuffer - 20;

      if (needsRebuild) {
        if (!sCache) {
          sCache = {
            canvas: document.createElement('canvas'),
            centerX: player.x,
            centerY: player.y,
            halfSpanWorld: cacheHalfSpan,
            rng,
            scale,
            dpr,
            worldRefObj: world
          };
          staticCacheRef.current = sCache;
        }
        const pixelScale = scale * dpr;
        const cw = Math.min(1024, Math.max(64, Math.ceil(cacheHalfSpan * 2 * pixelScale)));
        const ch = cw;
        const effScale = cw / (cacheHalfSpan * 2);
        if (sCache.canvas.width !== cw || sCache.canvas.height !== ch) {
          sCache.canvas.width = cw;
          sCache.canvas.height = ch;
        }
        sCache.centerX = player.x;
        sCache.centerY = player.y;
        sCache.halfSpanWorld = cacheHalfSpan;
        sCache.rng = rng;
        sCache.scale = scale;
        sCache.dpr = dpr;
        sCache.worldRefObj = world;

        const sCtx = sCache.canvas.getContext('2d');
        if (sCtx) {
          sCtx.setTransform(1, 0, 0, 1, 0, 0);
          sCtx.fillStyle = C.bgDeep;
          sCtx.fillRect(0, 0, cw, ch);
          sCtx.save();
          sCtx.scale(effScale, effScale);
          sCtx.translate(-(sCache.centerX - cacheHalfSpan), -(sCache.centerY - cacheHalfSpan));
          const cacheView: View = {
            minX: sCache.centerX - cacheHalfSpan,
            maxX: sCache.centerX + cacheHalfSpan,
            minY: sCache.centerY - cacheHalfSpan,
            maxY: sCache.centerY + cacheHalfSpan
          };
          drawTerrain(sCtx, world, px);
          drawRoads(sCtx, world, cacheView, px, rng < 900);
          drawRails(sCtx, world, cacheView, px);
          drawParkings(sCtx, world, cacheView, px, false);
          drawBuildings(sCtx, world, cacheView, px);
          sCtx.restore();
        }
      }

      if (sCache) {
        ctx.drawImage(
          sCache.canvas,
          sCache.centerX - sCache.halfSpanWorld,
          sCache.centerY - sCache.halfSpanWorld,
          sCache.halfSpanWorld * 2,
          sCache.halfSpanWorld * 2
        );
      }

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

      // soft vignette (cached per canvas size)
      let vig = vignetteCacheRef.current;
      if (!vig || vig.w !== cssW || vig.h !== cssH) {
        const g = ctx.createRadialGradient(cx, cy, Math.min(cssW, cssH) * 0.32, cx, cy, Math.max(cssW, cssH) * 0.72);
        g.addColorStop(0, 'rgba(11,12,14,0)');
        g.addColorStop(1, 'rgba(11,12,14,0.55)');
        vig = { w: cssW, h: cssH, gradient: g };
        vignetteCacheRef.current = vig;
      }
      ctx.fillStyle = vig.gradient;
      ctx.fillRect(0, 0, cssW, cssH);

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
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); window.removeEventListener('resize', fit); };
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
});

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  X, Search, Plus, Minus, LocateFixed, Navigation, Zap, Layers, List, Car, HeartPulse, Shield, Flame, ShoppingBag,
  Wrench, Fuel, Utensils, Pill, TreePine, Mountain, Truck, Building2, TrainTrack, MapPin, Map as MapIcon, ChevronDown
} from 'lucide-react';
import type { Camera, GameWorld, Player } from '../types';
import type { SpawnLocation } from '../spawnLocations';
import { ShadowHost } from './ShadowHost';
import fullMapCss from './fullMap.css?inline';
import { collectLandmarks, type Landmark, type LandmarkIconKey } from '../map/landmarks';
import {
  MAP_COLORS as C, MAP_FONT, GROUP_COLORS, GROUP_LABELS, formatDistance, formatEta, type MapMarkerGroup
} from '../map/mapTheme';
import {
  drawTerrain, drawRoads, drawRails, drawBuildings, drawParkings, drawSignals, drawRoute, drawDestination,
  drawTraffic, drawPedestrians, drawPlayer, drawPin, type View
} from '../map/mapDraw';

interface FullScreenMapProps {
  world: GameWorld | null;
  player: Player;
  camera: Camera;
  isOpen: boolean;
  onClose: () => void;
  onTeleport: (loc: SpawnLocation) => void;
  onSetGpsTarget: (target: { x: number; y: number; name?: string } | null) => void;
  streetName: string;
}

const ZOOM_MIN = 0.03;
const ZOOM_MAX = 2.5;
const ZOOM_START = 0.3;

type Selection = { kind: 'poi'; lm: Landmark } | { kind: 'point'; x: number; y: number };
type Filter = MapMarkerGroup | 'all';

const ICONS: Record<LandmarkIconKey, React.ComponentType<{ className?: string }>> = {
  car: Car, hospital: HeartPulse, police: Shield, fire: Flame, mall: ShoppingBag, garage: Wrench, fuel: Fuel, food: Utensils,
  pharmacy: Pill, nature: TreePine, mountain: Mountain, industrial: Truck, agency: Building2, train: TrainTrack, spawn: MapPin
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const FullMapInner: React.FC<FullScreenMapProps> = ({
  world, player, isOpen, onClose, onTeleport, onSetGpsTarget, streetName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const scaleRef = useRef<HTMLSpanElement | null>(null);
  const scaleBarRef = useRef<HTMLElement | null>(null);
  const coordRef = useRef<HTMLSpanElement | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [legend, setLegend] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // phones: list folded

  // camera of the map: world point in the centre of the screen + zoom (animated towards the target)
  const view = useRef({ x: player.x, y: player.y, zoom: ZOOM_START });
  const target = useRef({ x: player.x, y: player.y, zoom: ZOOM_START });
  const worldRef = useRef(world); worldRef.current = world;
  const playerRef = useRef(player); playerRef.current = player;

  const all = useMemo(() => collectLandmarks(world), [world]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: all.length };
    for (const m of all) c[m.group] = (c[m.group] || 0) + 1;
    return c;
  }, [all]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => all.filter(m => {
    if (filter !== 'all' && m.group !== filter) return false;
    if (q && !(m.nameRu.toLowerCase().includes(q) || m.description.toLowerCase().includes(q))) return false;
    return true;
  }), [all, filter, q]);

  const sorted = useMemo(() => {
    const p = playerRef.current;
    return filtered.map(m => ({ m, d: Math.hypot(m.x - p.x, m.y - p.y) })).sort((a, b) => a.d - b.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, isOpen]);

  const filteredRef = useRef(filtered); filteredRef.current = filtered;
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const hoverRef = useRef(hoverId); hoverRef.current = hoverId;

  const size = () => {
    const el = wrapRef.current;
    return { w: el?.clientWidth || window.innerWidth, h: el?.clientHeight || window.innerHeight };
  };

  const flyTo = useCallback((x: number, y: number, zoom?: number) => {
    target.current = { x, y, zoom: zoom ?? Math.max(target.current.zoom, 0.25) };
  }, []);

  const centerOnPlayer = useCallback(() => {
    flyTo(playerRef.current.x, playerRef.current.y, 0.3);
  }, [flyTo]);

  const zoomAt = useCallback((factor: number, sx?: number, sy?: number) => {
    const { w, h } = size();
    const px = sx ?? w / 2, py = sy ?? h / 2;
    const t = target.current;
    const nz = clamp(t.zoom * factor, ZOOM_MIN, ZOOM_MAX);
    // keep the world point under (px,py) fixed
    const wx = t.x + (px - w / 2) / t.zoom;
    const wy = t.y + (py - h / 2) / t.zoom;
    target.current = { x: wx - (px - w / 2) / nz, y: wy - (py - h / 2) / nz, zoom: nz };
  }, []);

  // open: reset to the player
  useEffect(() => {
    if (!isOpen) return;
    const p = playerRef.current;
    view.current = { x: p.x, y: p.y, zoom: ZOOM_START };
    target.current = { x: p.x, y: p.y, zoom: ZOOM_START };
    setSelected(null); setQuery(''); setFilter('all'); setDropOpen(false);
  }, [isOpen]);

  // keyboard
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') { onClose(); e.preventDefault(); return; }
      const step = 90 / target.current.zoom;
      const t = target.current;
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') target.current = { ...t, x: t.x - step };
      else if (e.key === 'ArrowRight' || e.code === 'KeyD') target.current = { ...t, x: t.x + step };
      else if (e.key === 'ArrowUp' || e.code === 'KeyW') target.current = { ...t, y: t.y - step };
      else if (e.key === 'ArrowDown' || e.code === 'KeyS') target.current = { ...t, y: t.y + step };
      else if (e.key === '+' || e.key === '=') zoomAt(1.3);
      else if (e.key === '-' || e.key === '_') zoomAt(1 / 1.3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, zoomAt]);

  // ---------------------------------------------------------------- render loop
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let lastHud = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const world = worldRef.current, player = playerRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      const tw = Math.round(w * dpr), th = Math.round(h * dpr);
      if (canvas.width !== tw || canvas.height !== th) { canvas.width = tw; canvas.height = th; }

      // ease towards target
      const v = view.current, t = target.current;
      const k = 0.2;
      v.x += (t.x - v.x) * k; v.y += (t.y - v.y) * k; v.zoom += (t.zoom - v.zoom) * k;
      if (Math.abs(t.x - v.x) < 0.01 / v.zoom) v.x = t.x;
      if (Math.abs(t.y - v.y) < 0.01 / v.zoom) v.y = t.y;
      if (Math.abs(t.zoom - v.zoom) < 1e-4) v.zoom = t.zoom;
      const z = v.zoom, px = 1 / z;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = C.bgDeep; ctx.fillRect(0, 0, w, h);
      if (!world) return;
      const time = Date.now();

      // world layer
      ctx.save();
      ctx.translate(w / 2 - v.x * z, h / 2 - v.y * z);
      ctx.scale(z, z);
      const view_: View = { minX: v.x - w / 2 * px - 200, maxX: v.x + w / 2 * px + 200, minY: v.y - h / 2 * px - 200, maxY: v.y + h / 2 * px + 200 };

      drawTerrain(ctx, world, px);

      // blueprint grid (screen-aligned spacing, snaps to 1/2/5 x 10^n world units)
      const raw = 90 * px, pow = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 5, 10].map(m => m * pow).find(s => s >= raw) || raw;
      ctx.strokeStyle = C.grid; ctx.lineWidth = px;
      ctx.beginPath();
      for (let gx = Math.floor(view_.minX / step) * step; gx < view_.maxX; gx += step) { ctx.moveTo(gx, view_.minY); ctx.lineTo(gx, view_.maxY); }
      for (let gy = Math.floor(view_.minY / step) * step; gy < view_.maxY; gy += step) { ctx.moveTo(view_.minX, gy); ctx.lineTo(view_.maxX, gy); }
      ctx.stroke();

      drawRoads(ctx, world, view_, px, z > 0.1);
      drawRails(ctx, world, view_, px);
      drawParkings(ctx, world, view_, px, z > 0.3);
      drawBuildings(ctx, world, view_, px);
      if (z > 0.12) drawSignals(ctx, world, view_, px);
      drawRoute(ctx, world, px, time);
      drawDestination(ctx, world, px, time);
      if (z > 0.07) drawTraffic(ctx, world, view_, px, time, 12);
      if (z > 0.5) drawPedestrians(ctx, world, view_, px);
      drawPlayer(ctx, player, px * 1.15, time, true);

      // free map point
      const sel = selectedRef.current;
      if (sel && sel.kind === 'point') {
        ctx.save(); ctx.translate(sel.x, sel.y);
        const p = (time % 1400) / 1400;
        ctx.strokeStyle = C.amberHi; ctx.lineWidth = 2 * px;
        ctx.beginPath(); ctx.arc(0, 0, 9 * px, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1 - p; ctx.beginPath(); ctx.arc(0, 0, (9 + p * 16) * px, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1; ctx.beginPath();
        ctx.moveTo(-15 * px, 0); ctx.lineTo(-5 * px, 0); ctx.moveTo(15 * px, 0); ctx.lineTo(5 * px, 0);
        ctx.moveTo(0, -15 * px); ctx.lineTo(0, -5 * px); ctx.moveTo(0, 15 * px); ctx.lineTo(0, 5 * px); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // screen layer: markers + labels
      const toX = (x: number) => (x - v.x) * z + w / 2;
      const toY = (y: number) => (y - v.y) * z + h / 2;
      const marks = filteredRef.current;
      const selId = sel && sel.kind === 'poi' ? sel.lm.id : null;
      const hov = hoverRef.current;
      const labels: { x: number; y: number; text: string; hot: boolean }[] = [];
      for (const m of marks) {
        const sx = toX(m.x), sy = toY(m.y);
        if (sx < -30 || sy < -30 || sx > w + 30 || sy > h + 30) continue;
        const hot = m.id === selId || m.id === hov;
        const r = hot ? 12 : z < 0.1 ? 6 : 9;
        drawPin(ctx, sx, sy, r, GROUP_COLORS[m.group], m.iconKey, m.id === selId);
        if (hot || z > 0.45) labels.push({ x: sx, y: sy + r + 12, text: m.nameRu, hot });
      }
      ctx.font = `700 12px ${MAP_FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
      labels.sort((a, b) => Number(b.hot) - Number(a.hot));
      for (const l of labels) {
        const text = l.text.toUpperCase();
        const tw2 = ctx.measureText(text).width + 14;
        const box = { x0: l.x - tw2 / 2, y0: l.y - 9, x1: l.x + tw2 / 2, y1: l.y + 9 };
        if (!l.hot && placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0)) continue;
        placed.push(box);
        ctx.fillStyle = l.hot ? C.amber : 'rgba(16,16,18,0.86)';
        ctx.beginPath(); ctx.roundRect(box.x0, box.y0, box.x1 - box.x0, 18, 5); ctx.fill();
        ctx.strokeStyle = l.hot ? C.amberSoft : 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = l.hot ? '#1a1409' : C.text;
        ctx.fillText(text, l.x, l.y + 0.5);
      }

      // player label
      if (z > 0.15) {
        const sx = toX(player.x), sy = toY(player.y) - 26;
        ctx.font = `700 12px ${MAP_FONT}`;
        const text = 'ВЫ', tw3 = ctx.measureText(text).width + 14;
        ctx.fillStyle = C.amber; ctx.beginPath(); ctx.roundRect(sx - tw3 / 2, sy - 9, tw3, 18, 5); ctx.fill();
        ctx.fillStyle = '#1a1409'; ctx.fillText(text, sx, sy + 0.5);
      }

      // scale bar + zoom readout (DOM, ~5 Hz)
      if (now - lastHud > 180) {
        lastHud = now;
        const target2 = 110 * px;
        const p10 = Math.pow(10, Math.floor(Math.log10(target2)));
        const nice = [1, 2, 5, 10].map(m => m * p10).find(s => s >= target2 * 0.7) || p10;
        if (scaleBarRef.current) scaleBarRef.current.style.width = Math.round(nice * z) + 'px';
        if (scaleRef.current) scaleRef.current.textContent = nice >= 1000 ? nice / 1000 + ' км' : nice + ' м';
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [isOpen]);

  // ---------------------------------------------------------------- pointer input
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startX: 0, startY: 0, moved: false, pinch: 0, pinchZoom: 1 });

  const localPos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const screenToWorld = (sx: number, sy: number) => {
    const { w, h } = size();
    const v = view.current;
    return { x: v.x + (sx - w / 2) / v.zoom, y: v.y + (sy - h / 2) / v.zoom };
  };
  const hitTest = (sx: number, sy: number): Landmark | null => {
    const { w, h } = size();
    const v = view.current;
    const hr = window.matchMedia && window.matchMedia('(pointer:coarse)').matches ? 24 : 16;
    let best: Landmark | null = null, bd = hr * hr;
    for (const m of filteredRef.current) {
      const dx = (m.x - v.x) * v.zoom + w / 2 - sx, dy = (m.y - v.y) * v.zoom + h / 2 - sy;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = localPos(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (pointers.current.size === 1) { g.startX = p.x; g.startY = p.y; g.moved = false; setDragging(true); }
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.pinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      g.pinchZoom = target.current.zoom;
      g.moved = true;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = localPos(e);
    const prev = pointers.current.get(e.pointerId);
    const g = gesture.current;
    if (coordRef.current) {
      const wp = screenToWorld(p.x, p.y);
      coordRef.current.textContent = `X ${Math.round(wp.x)}  Y ${Math.round(wp.y)}`;
    }
    if (!prev) {
      const hit = hitTest(p.x, p.y);
      const id = hit ? hit.id : null;
      if (id !== hoverRef.current) setHoverId(id);
      return;
    }
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const nz = clamp(g.pinchZoom * (dist / g.pinch), ZOOM_MIN, ZOOM_MAX);
      const f = nz / target.current.zoom;
      zoomAt(f, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (Math.hypot(p.x - g.startX, p.y - g.startY) > 5) g.moved = true;
    if (g.moved) {
      const dx = p.x - prev.x, dy = p.y - prev.y;
      const t = target.current;
      // direct manipulation: move view and target together (no easing lag while dragging)
      const nx = t.x - dx / view.current.zoom, ny = t.y - dy / view.current.zoom;
      target.current = { ...t, x: nx, y: ny };
      view.current = { ...view.current, x: view.current.x - dx / view.current.zoom, y: view.current.y - dy / view.current.zoom };
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const p = localPos(e);
    const had = pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) setDragging(false);
    if (!had || g.moved || pointers.current.size > 0) return;
    // a click
    const hit = hitTest(p.x, p.y);
    setDropOpen(false);
    if (hit) { setSelected({ kind: 'poi', lm: hit }); flyTo(hit.x, hit.y); return; }
    const wp = screenToWorld(p.x, p.y);
    setSelected({ kind: 'point', x: Math.round(wp.x), y: Math.round(wp.y) });
  };

  const onWheel = (e: React.WheelEvent) => {
    const p = localPos(e as unknown as React.PointerEvent);
    zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, p.x, p.y);
  };

  // React attaches wheel listeners as passive, so also block page scroll natively
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const stop = (e: WheelEvent) => e.preventDefault();
    c.addEventListener('wheel', stop, { passive: false });
    return () => c.removeEventListener('wheel', stop);
  }, [isOpen]);

  // ---------------------------------------------------------------- actions
  const selX = selected ? (selected.kind === 'poi' ? selected.lm.x : selected.x) : 0;
  const selY = selected ? (selected.kind === 'poi' ? selected.lm.y : selected.y) : 0;
  const selName = selected ? (selected.kind === 'poi' ? selected.lm.nameRu : 'Метка на карте') : '';
  const selDist = selected ? Math.hypot(selX - player.x, selY - player.y) : 0;

  const route = () => {
    if (!selected) return;
    onSetGpsTarget({ x: selX, y: selY, name: selName });
    onClose();
  };
  const teleport = () => {
    if (!selected) return;
    const loc: SpawnLocation = selected.kind === 'poi' && selected.lm.spawnLoc
      ? selected.lm.spawnLoc
      : { id: selected.kind === 'poi' ? selected.lm.id : 'map_point', name: selName, nameRu: selName, x: selX, y: selY, description: selected.kind === 'poi' ? selected.lm.description : '', icon: null };
    onTeleport(loc);
    onClose();
  };
  const pick = (m: Landmark) => { setSelected({ kind: 'poi', lm: m }); flyTo(m.x, m.y, Math.max(target.current.zoom, 0.4)); setDropOpen(false); };

  if (!isOpen) return null;

  const dest = world?.gpsDestination || null;
  const dDist = dest ? Math.hypot(dest.x - player.x, dest.y - player.y) : 0;
  const cats: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Все' },
    ...((['spawns', 'gas_stations', 'services', 'shops', 'nature', 'industrial'] as MapMarkerGroup[])
      .filter(g => counts[g]).map(g => ({ id: g as Filter, label: GROUP_LABELS[g] })))
  ];

  const pills = (cls: string) => (
    <div className={cls}>
      {cats.map(c => (
        <button key={c.id} type="button" className={'pill' + (filter === c.id ? ' pill-on' : '')} onClick={() => setFilter(c.id)}>
          {c.label}<i>{counts[c.id] ?? 0}</i>
        </button>
      ))}
    </div>
  );

  return (
    <div className="fm" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className={'fm-canvas' + (dragging ? ' drag' : hoverId ? ' hot' : '')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => { if (hoverRef.current) setHoverId(null); }}
        onWheel={onWheel}
      />
      <div className="fm-shade" />
      <div className="fm-ui">

      {/* top bar */}
      <div className="fm-top">
        <button type="button" className="chip sq" onClick={onClose} aria-label="Закрыть карту" title="Закрыть [Esc]"><X size={20} /></button>
        <div className="ttl cn">Карта</div>
        <div className="chip fm-search">
          <label>
            <Search size={18} color="#a29e93" />
            <input
              type="text"
              value={query}
              placeholder="Поиск мест: АЗС, больница, автосалон…"
              onChange={e => { setQuery(e.target.value); setDropOpen(true); }}
              onFocus={() => setDropOpen(true)}
              onKeyDown={e => {
                e.stopPropagation();
                if (e.key === 'Escape') { if (query) setQuery(''); else (e.target as HTMLInputElement).blur(); setDropOpen(false); }
                if (e.key === 'Enter' && sorted.length) pick(sorted[0].m);
              }}
            />
            {query && <button type="button" className="clr" onClick={() => setQuery('')} aria-label="Очистить"><X size={15} /></button>}
          </label>
          {dropOpen && q && (
            <div className="fm-drop">
              {sorted.length === 0
                ? <div className="fm-none">Ничего не найдено</div>
                : sorted.slice(0, 8).map(({ m, d }) => (
                    <button key={m.id} type="button" className="row" onClick={() => pick(m)}>
                      <span className="ic" style={{ background: GROUP_COLORS[m.group] }}>{React.createElement(ICONS[m.iconKey], { className: 'ic-i' })}</span>
                      <span className="tx"><div className="nm">{m.nameRu}</div><div className="ds">{m.description}</div></span>
                      <span className="dist">{formatDistance(d)}</span>
                    </button>
                  ))}
            </div>
          )}
        </div>
        {dest && (
          <div className="chip fm-gps">
            <Navigation size={18} color="#e0ab45" />
            <b>{dest.name || 'Маршрут'}</b>
            <small>{formatDistance(dDist)} · {formatEta(dDist)}</small>
            <button type="button" className="x" onClick={() => onSetGpsTarget(null)} aria-label="Сбросить маршрут" title="Сбросить маршрут"><X size={16} /></button>
          </div>
        )}
      </div>

      {pills('fm-pills')}

      {/* right panel */}
      <aside className={'fm-side' + (collapsed ? ' collapsed' : '') + (selected ? '' : ' nosel')}>
        {selected ? (
          <div className="fm-sel" key={selected.kind === 'poi' ? selected.lm.id : 'pt'}>
            <div className="grp cn">{selected.kind === 'poi' ? GROUP_LABELS[selected.lm.group] : 'Свободная точка'}</div>
            <h2>{selName}</h2>
            {selected.kind === 'poi'
              ? <p>{selected.lm.description}</p>
              : <p>X {selX} · Y {selY}</p>}
            <div className="fm-meta">{formatDistance(selDist)} · {formatEta(selDist)}</div>
            <div className="fm-stats">
              <div><div className="stat-n">{formatDistance(selDist)}</div><div className="stat-l">Расстояние</div></div>
              <div><div className="stat-n">{formatEta(selDist)}</div><div className="stat-l">В пути</div></div>
            </div>
            <div className="fm-acts">
              <button type="button" className="btn btn-p" onClick={route}><Navigation size={18} />Маршрут</button>
              <button type="button" className="btn btn-s" onClick={teleport}><Zap size={18} />Телепорт</button>
            </div>
          </div>
        ) : (
          <div className="fm-empty">
            <b>Выберите место</b> на карте или в списке, либо нажмите в любую точку, чтобы поставить метку. Колесо мыши — масштаб, перетаскивание — сдвиг.
          </div>
        )}
        {pills('fm-pills-in')}
        <div className="fm-listhd cn">
          <span>Места рядом</span><span>{sorted.length}</span>
        </div>
        <div className="fm-list">
          {sorted.length === 0 && <div className="fm-none">Нет мест в этой категории</div>}
          {sorted.slice(0, 80).map(({ m, d }) => (
            <button key={m.id} type="button" className={'row' + (selected?.kind === 'poi' && selected.lm.id === m.id ? ' row-on' : '')} onClick={() => pick(m)}>
              <span className="ic" style={{ background: GROUP_COLORS[m.group] }}>{React.createElement(ICONS[m.iconKey], { className: 'ic-i' })}</span>
              <span className="tx"><div className="nm">{m.nameRu}</div><div className="ds">{m.description}</div></span>
              <span className="dist">{formatDistance(d)}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* zoom + legend */}
      <div className="fm-zoom">
        <button type="button" className="chip sq" onClick={() => zoomAt(1.4)} aria-label="Приблизить" title="Приблизить [+]"><Plus size={20} /></button>
        <button type="button" className="chip sq" onClick={() => zoomAt(1 / 1.4)} aria-label="Отдалить" title="Отдалить [-]"><Minus size={20} /></button>
        <button type="button" className="chip sq" onClick={centerOnPlayer} aria-label="К игроку" title="К игроку"><LocateFixed size={20} color="#e0ab45" /></button>
        <button type="button" className="chip sq fm-desk" onClick={() => flyTo(world ? world.width / 2 : 26000, world ? world.height / 2 : 15000, 0.035)} aria-label="Вся карта" title="Вся карта"><MapIcon size={20} /></button>
        <button type="button" className={'chip sq fm-mlist'} onClick={() => setCollapsed(c => !c)} aria-label="Список мест" title="Список мест">{collapsed ? <List size={20} /> : <ChevronDown size={20} />}</button>
        <button type="button" className="chip sq fm-desk" onClick={() => setLegend(l => !l)} aria-label="Легенда" title="Легенда"><Layers size={20} /></button>
      </div>
      <div className="fm-scale"><span ref={scaleRef} /><i ref={scaleBarRef} /></div>
      {legend && (
        <div className="fm-legend">
          <div><s style={{ background: C.player }} />Вы</div>
          <div><s style={{ background: C.traffic }} />Трафик</div>
          <div><s style={{ background: C.signalGreen }} />Светофор</div>
          <div><s className="sq" style={{ background: C.parkingEdge }} />Парковка</div>
          <div><s className="sq" style={{ background: C.route }} />Маршрут</div>
          {(Object.keys(GROUP_LABELS) as MapMarkerGroup[]).map(g => <div key={g}><s style={{ background: GROUP_COLORS[g] }} />{GROUP_LABELS[g]}</div>)}
        </div>
      )}

      <div className="fm-hint">
        <span><span className="key">Esc</span>Закрыть</span>
        <span><span className="key">WASD</span>Сдвиг</span>
        <span><span className="key">+ / −</span>Масштаб</span>
        <span className="sp"><span ref={coordRef}>{streetName}</span></span>
      </div>
      </div>
    </div>
  );
};

export const FullScreenMap: React.FC<FullScreenMapProps> = (props) => {
  if (!props.isOpen) return null;
  return (
    <ShadowHost css={fullMapCss} background="#0d0e10" zIndex={55}>
      <FullMapInner {...props} />
    </ShadowHost>
  );
};

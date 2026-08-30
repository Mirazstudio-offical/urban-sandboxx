import React, { useEffect, useRef, useState } from 'react';
import { Camera, GameWorld, Player } from '../types';
import { SPAWN_LOCATIONS, SpawnLocation } from '../App';
import { 
  Compass, 
  Crosshair, 
  MapPin, 
  Minus, 
  Navigation, 
  Plus, 
  RotateCcw, 
  X,
  Zap
} from 'lucide-react';

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

// Points of interest for gas stations and main city landmarks
const GAS_STATIONS = [
  { name: 'AZS Premium Fuel', x: 3400, y: 1900 },
  { name: 'Express Fuel Station', x: 2100, y: 3900 },
  { name: 'Logistics Highway Gas', x: 4900, y: 3800 },
];

export const FullScreenMap: React.FC<FullScreenMapProps> = ({
  world,
  player,
  camera,
  isOpen,
  onClose,
  onTeleport,
  onSetGpsTarget,
  streetName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Map viewport panning & zooming state
  const [zoom, setZoom] = useState<number>(0.32); // Initial city overview scale
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedSpawn, setSelectedSpawn] = useState<SpawnLocation | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(true);

  // Center pan on player when opening map
  useEffect(() => {
    if (isOpen) {
      centerOnPlayer();
    }
  }, [isOpen]);

  const centerOnPlayer = () => {
    if (!canvasRef.current || !world) return;
    const w = canvasRef.current.width || window.innerWidth;
    const h = canvasRef.current.height || window.innerHeight;
    // Pan offset such that player coordinates (player.x, player.y) fall at center of canvas
    setPanOffset({
      x: w / 2 - player.x * zoom,
      y: h / 2 - player.y * zoom,
    });
  };

  // Keyboard navigation inside map (M or ESC to close, WASD/Arrows to pan, +/- to zoom)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyM') {
        onClose();
        e.preventDefault();
        return;
      }
      const panStep = 60 / zoom;
      if (e.key === 'ArrowLeft' || e.code === 'KeyA') {
        setPanOffset((prev) => ({ ...prev, x: prev.x + panStep }));
      }
      if (e.key === 'ArrowRight' || e.code === 'KeyD') {
        setPanOffset((prev) => ({ ...prev, x: prev.x - panStep }));
      }
      if (e.key === 'ArrowUp' || e.code === 'KeyW') {
        setPanOffset((prev) => ({ ...prev, y: prev.y + panStep }));
      }
      if (e.key === 'ArrowDown' || e.code === 'KeyS') {
        setPanOffset((prev) => ({ ...prev, y: prev.y - panStep }));
      }
      if (e.key === '+' || e.key === '=') {
        handleZoom(0.08);
      }
      if (e.key === '-') {
        handleZoom(-0.08);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoom, onClose]);

  // Handle Canvas Resize & Rendering loop
  useEffect(() => {
    if (!isOpen || !world) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const renderMap = () => {
      const w = canvas.width;
      const h = canvas.height;

      // 1. Dark blueprint background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, w, h);

      // Grid pattern
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 100 * zoom;
      const startX = (panOffset.x % gridSize + gridSize) % gridSize;
      const startY = (panOffset.y % gridSize + gridSize) % gridSize;

      for (let x = startX; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = startY; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoom, zoom);

      // 2. City Border & Water/Grass background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, world.width, world.height);

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 8;
      ctx.strokeRect(0, 0, world.width, world.height);

      // Parks & Green zones
      ctx.fillStyle = '#14532d22';
      ctx.strokeStyle = '#15803d44';
      ctx.lineWidth = 3;
      // Central park zone
      ctx.fillRect(3800, 2200, 1200, 1200);
      ctx.strokeRect(3800, 2200, 1200, 1200);
      // Pine forest zone
      ctx.fillRect(200, 200, 1400, 1400);
      ctx.strokeRect(200, 200, 1400, 1400);

      // 3. Roads Network
      world.roads.forEach((road) => {
        const isHoriz = road.direction === 'horizontal';
        ctx.fillStyle = '#334155';
        if (isHoriz) {
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
        } else {
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
        }

        // Road center line
        ctx.strokeStyle = '#f59e0b88';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([12 / zoom, 8 / zoom]);
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1);
        ctx.lineTo(road.x2, road.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Intersections & Traffic Lights
      world.intersections.forEach((inter) => {
        const phase = inter.phases[inter.currentPhaseIndex];
        const isGreen = phase.nsState === 'green';

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(inter.x - inter.width / 2, inter.y - inter.height / 2, inter.width, inter.height);

        // Light dot indicator
        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.shadowColor = isGreen ? '#22c55e' : '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 5. Buildings Silhouettes
      ctx.fillStyle = '#1e293b88';
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      world.buildings.forEach((bld) => {
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
      });

      // 6. Parking Plaza Areas (🅿️)
      world.parkings.forEach((pk) => {
        ctx.fillStyle = '#1e3a8a33';
        ctx.strokeStyle = '#3b82f688';
        ctx.lineWidth = 2;
        ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
        ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);

        // Parking label
        ctx.fillStyle = '#60a5fa';
        ctx.font = `bold ${Math.max(16, 22 / zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🅿️', pk.x + pk.width / 2, pk.y + pk.height / 2);
      });

      // 7. Gas Stations (⛽)
      GAS_STATIONS.forEach((gs) => {
        ctx.fillStyle = '#f59e0b33';
        ctx.strokeStyle = '#f59e0b88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gs.x, gs.y, 45, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = `bold ${Math.max(16, 22 / zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛽', gs.x, gs.y);
      });

      // 7b. GPS Route Path Line
      if (world.gpsPath && world.gpsPath.length > 1) {
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 10 / Math.max(0.5, zoom);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.moveTo(world.gpsPath[0].x, world.gpsPath[0].y);
        for (let i = 1; i < world.gpsPath.length; i++) {
          ctx.lineTo(world.gpsPath[i].x, world.gpsPath[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 / Math.max(0.5, zoom);
        ctx.setLineDash([12 / zoom, 12 / zoom]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
      }

      // 7c. GPS Destination Marker
      if (world.gpsDestination) {
        const dest = world.gpsDestination;
        ctx.save();
        ctx.translate(dest.x, dest.y);
        ctx.fillStyle = '#0284c7';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩', 0, -2);
        ctx.restore();
      }

      // 8. NPC Traffic Cars & Pedestrians
      ctx.fillStyle = '#facc15';
      world.vehicles.forEach((veh) => {
        if (!veh.isPlayerControlled) {
          ctx.beginPath();
          ctx.arc(veh.x, veh.y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = '#c084fc';
      world.pedestrians.forEach((ped) => {
        ctx.beginPath();
        ctx.arc(ped.x, ped.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });

      // 9. District / Spawn Location Badges & Labels
      SPAWN_LOCATIONS.forEach((loc) => {
        const isSel = selectedSpawn?.id === loc.id;

        // Radius ring
        ctx.strokeStyle = isSel ? '#34d399' : '#38bdf888';
        ctx.lineWidth = isSel ? 4 : 2;
        ctx.fillStyle = isSel ? '#05966944' : '#0284c722';
        ctx.beginPath();
        ctx.arc(loc.x, loc.y, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Icon text
        ctx.font = '28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(loc.icon, loc.x, loc.y - 10);

        // District title background pill
        ctx.font = 'bold 16px sans-serif';
        const textMetrics = ctx.measureText(loc.nameRu);
        const pWidth = textMetrics.width + 24;
        const pHeight = 28;

        ctx.fillStyle = isSel ? '#065f46' : '#0f172a';
        ctx.strokeStyle = isSel ? '#10b981' : '#0284c7';
        ctx.lineWidth = 1.5;

        const rx = loc.x - pWidth / 2;
        const ry = loc.y + 25;
        ctx.beginPath();
        ctx.roundRect(rx, ry, pWidth, pHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(loc.nameRu, loc.x, ry + pHeight / 2);
      });

      // 10. PLAYER MARKER (Glow + Direction + Coordinates)
      ctx.save();
      ctx.translate(player.x, player.y);

      // Pulse ring
      const pulse = (Date.now() % 1500) / 1500;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + pulse * 45, 0, Math.PI * 2);
      ctx.stroke();

      // Heading Arrow
      ctx.rotate(player.angle);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(24, 0);
      ctx.lineTo(-14, -14);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-14, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();

      // Player label pin above player
      ctx.font = 'bold 15px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('📍 ВЫ ЗДЕСЬ', player.x, player.y - 35);

      ctx.restore();

      animId = requestAnimationFrame(renderMap);
    };

    renderMap();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, world, player, zoom, panOffset, selectedSpawn]);

  // Drag pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Click on canvas to select spawn point, gas station or set custom GPS target
  const handleCanvasClick = (e: React.MouseEvent) => {
    const distMoved = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (distMoved > 6) return; // Was panning/dragging, not a static click

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (clickX - panOffset.x) / zoom;
    const worldY = (clickY - panOffset.y) / zoom;

    // Check if clicked near any spawn location
    let found: SpawnLocation | null = null;
    for (const loc of SPAWN_LOCATIONS) {
      const dist = Math.hypot(loc.x - worldX, loc.y - worldY);
      if (dist < 100) {
        found = loc;
        break;
      }
    }

    if (found) {
      setSelectedSpawn(found);
      onSetGpsTarget({ x: found.x, y: found.y, name: found.nameRu });
    } else {
      // Check if clicked gas station
      let foundGas = false;
      for (const gs of GAS_STATIONS) {
        if (Math.hypot(gs.x - worldX, gs.y - worldY) < 80) {
          onSetGpsTarget({ x: gs.x, y: gs.y, name: gs.name });
          foundGas = true;
          break;
        }
      }

      if (!foundGas) {
        setSelectedSpawn(null);
        onSetGpsTarget({ x: worldX, y: worldY, name: 'Метка на карте' });
      }
    }
  };

  // Zoom slider / wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    handleZoomAtPoint(zoomFactor, e.clientX, e.clientY);
  };

  const handleZoom = (delta: number) => {
    if (!canvasRef.current) return;
    const cx = canvasRef.current.width / 2;
    const cy = canvasRef.current.height / 2;
    const factor = delta > 0 ? 1.25 : 0.8;
    handleZoomAtPoint(factor, cx, cy);
  };

  const handleZoomAtPoint = (factor: number, screenX: number, screenY: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.12, Math.min(2.5, prevZoom * factor));
      // Adjust panOffset so point under cursor stays fixed
      const wx = (screenX - panOffset.x) / prevZoom;
      const wy = (screenY - panOffset.y) / prevZoom;

      setPanOffset({
        x: screenX - wx * newZoom,
        y: screenY - wy * newZoom,
      });

      return newZoom;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans select-none animate-in fade-in duration-150">
      {/* MAP CANVAS */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
        onWheel={handleWheel}
        className={`w-full h-full block ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* TOP HEADER OVERLAY */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* District & Player Location Card */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4 pointer-events-auto">
          <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
            <Compass className="w-6 h-6 animate-spin" style={{ animationDuration: '10s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-sky-400">Интерактивная Карта Города</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">[M] Закрыть</span>
            </div>
            <h2 className="text-white font-bold text-lg leading-snug">{streetName}</h2>
            <div className="text-xs text-slate-400 font-mono">
              Координаты: X: {Math.round(player.x)} · Y: {Math.round(player.y)}
            </div>
          </div>
        </div>

        {/* GPS Active Target Pill */}
        {world?.gpsDestination && (
          <div className="bg-sky-950/95 backdrop-blur-md border border-sky-400/60 rounded-2xl px-4 py-2.5 shadow-2xl flex items-center gap-3 text-white pointer-events-auto animate-in slide-in-from-top-3 duration-200">
            <span className="text-xl">🚩</span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-sky-300">
                Маршрут: {world.gpsDestination.name || 'Точка назначения'}
              </span>
              <span className="text-[11px] text-slate-300">
                Расстояние: {Math.round(Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y))} м
              </span>
            </div>
            <button
              onClick={() => onSetGpsTarget(null)}
              className="p-1 hover:bg-sky-800 rounded-lg text-sky-200 hover:text-white transition-all ml-1"
              title="Сбросить маршрут"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Close Button */}
        <button
          id="btn-close-map"
          onClick={onClose}
          className="bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white p-3 rounded-2xl shadow-2xl pointer-events-auto transition-all"
          title="Закрыть карту (M / ESC)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* RIGHT SIDEBAR: ZOOM & CONTROLS */}
      <div className="absolute top-24 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => handleZoom(0.1)}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white p-3 rounded-xl shadow-xl transition-all"
          title="Приблизить (+)"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom(-0.1)}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white p-3 rounded-xl shadow-xl transition-all"
          title="Отдалить (-)"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={centerOnPlayer}
          className="bg-sky-950/90 hover:bg-sky-900 border border-sky-500/50 text-sky-300 p-3 rounded-xl shadow-xl transition-all"
          title="Центрировать на игроке"
        >
          <Crosshair className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setZoom(0.32);
            centerOnPlayer();
          }}
          className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-300 p-3 rounded-xl shadow-xl transition-all"
          title="Обзор всего города"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* SELECTED SPAWN / TELEPORT PANEL */}
      {selectedSpawn && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/50 p-4 rounded-2xl shadow-2xl flex items-center gap-4 text-white max-w-lg animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-3xl select-none">{selectedSpawn.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-base text-emerald-300">{selectedSpawn.nameRu}</h3>
            <p className="text-xs text-slate-300">{selectedSpawn.description}</p>
          </div>
          <button
            onClick={() => {
              onTeleport(selectedSpawn);
              onClose();
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all text-xs whitespace-nowrap"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>Телепорт сюда</span>
          </button>
        </div>
      )}

      {/* MAP LEGEND OVERLAY */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl text-xs text-slate-300">
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className="font-bold text-slate-200 flex items-center justify-between w-full gap-4 text-xs"
          >
            <span>🗺️ Легенда карты</span>
            <span>{showLegend ? '▼' : '▲'}</span>
          </button>

          {showLegend && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 pt-2 border-t border-slate-800 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-sky-400 border border-white" />
                <span>Игрок (Вы)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span>Машины трафика</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-purple-400" />
                <span>Пешеходы</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Светофоры (Зелёный/Красный)</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🅿️</span>
                <span>Парковки</span>
              </div>
              <div className="flex items-center gap-2">
                <span>⛽</span>
                <span>Заправки (АЗС)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Camera, GameWorld, Player } from '../types';
import { SPAWN_LOCATIONS, SpawnLocation } from '../App';
import { CITY_SHOPS } from './ShopModal';
import { 
  Compass, 
  Crosshair, 
  MapPin, 
  Minus, 
  Navigation, 
  Plus, 
  RotateCcw, 
  X,
  Zap,
  Layers,
  Info
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

// Safe canvas helpers to prevent IndexSizeError DOMExceptions
function safeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number = 0
) {
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return;
  const r = Math.min(Math.max(0, isFinite(radius) ? radius : 0), w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    try {
      ctx.roundRect(x, y, w, h, r);
      return;
    } catch {
      // Fall through to path fallback
    }
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
}

export interface CityLandmark {
  id: string;
  name: string;
  nameRu: string;
  category: 'park' | 'commercial' | 'residential' | 'industrial' | 'nature' | 'parking';
  x: number;
  y: number;
  icon: string;
  description: string;
}

// REAL in-game landmarks (strictly matching game world locations)
export const REAL_LANDMARKS: CityLandmark[] = [
  {
    id: 'central_park',
    name: 'Central Park & Fountain',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    category: 'park',
    x: 4400,
    y: 2800,
    icon: '⛲',
    description: 'Каскадный гранитный фонтан, аллеи со скамейками и сквер'
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Деловой Центр (Небоскребы & Башни)',
    category: 'commercial',
    x: 4350,
    y: 2000,
    icon: '🏙️',
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковка'
  },
  {
    id: 'auto_center',
    name: 'City Auto Mall & Showroom',
    nameRu: 'Автосалон & Торговый Комплекс',
    category: 'commercial',
    x: 3200,
    y: 2000,
    icon: '🏬',
    description: 'Автомобильный выставочный комплекс и торговый центр'
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Квартал (Уютный Двор)',
    category: 'residential',
    x: 2750,
    y: 2750,
    icon: '🏢',
    description: 'Многоэтажные дома, закрытый двор со скамейками и парковкой'
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Hub',
    nameRu: 'Логистический Хаб (Промзона)',
    category: 'industrial',
    x: 5200,
    y: 4400,
    icon: '🚛',
    description: 'Грузовые ангары, склады, стоянки спецтехники и терминалы'
  },
  {
    id: 'pine_forest',
    name: 'Pine Ridge Reserve',
    nameRu: 'Лесной Заповедник & Озеро',
    category: 'nature',
    x: 550,
    y: 550,
    icon: '🌲',
    description: 'Сосновый бор, извилистые грунтовые тропы, пруды и бездорожье'
  },
  {
    id: 'highway_junction',
    name: 'Silicon Expressway',
    nameRu: 'Скоростное Шоссе (Магистраль)',
    category: 'commercial',
    x: 4000,
    y: 4000,
    icon: '🛣️',
    description: 'Четырехполосная скоростная магистраль с активным движением'
  },
  ...CITY_SHOPS.map((s) => ({
    id: s.id,
    name: s.nameRu,
    nameRu: s.nameRu,
    category: 'commercial' as const,
    x: s.x,
    y: s.y,
    icon: s.icon,
    description: s.description
  }))
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
  const [zoom, setZoom] = useState<number>(0.35);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Touch tracking for mobile
  const touchesRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const initialPinchDistRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(0.35);
  const touchStartTimeRef = useRef<number>(0);

  const [selectedLandmark, setSelectedLandmark] = useState<CityLandmark | null>(null);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Center pan on player when opening map
  useEffect(() => {
    if (isOpen) {
      centerOnPlayer();
    }
  }, [isOpen]);

  const centerOnPlayer = () => {
    if (!canvasRef.current || !world) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPanOffset({
      x: w / 2 - player.x * zoom,
      y: h / 2 - player.y * zoom,
    });
  };

  const handleZoomAtPoint = (factor: number, screenX: number, screenY: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.12, Math.min(2.8, prevZoom * factor));
      const wx = (screenX - panOffset.x) / prevZoom;
      const wy = (screenY - panOffset.y) / prevZoom;

      setPanOffset({
        x: screenX - wx * newZoom,
        y: screenY - wy * newZoom,
      });

      return newZoom;
    });
  };

  const handleZoom = (delta: number) => {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const factor = delta > 0 ? 1.25 : 0.8;
    handleZoomAtPoint(factor, cx, cy);
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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const renderMap = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // 1. Dark blueprint background
      ctx.fillStyle = '#060a12';
      ctx.fillRect(0, 0, w, h);

      // Subtle tech background grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      ctx.lineWidth = 1;
      const gridSize = 100 * zoom;
      if (gridSize > 12) {
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
      }

      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoom, zoom);

      // 2. City Terrain & District Backgrounds
      // Base city canvas
      ctx.fillStyle = '#0c1322';
      ctx.fillRect(0, 0, world.width, world.height);

      // Outer boundary border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, world.width, world.height);

      // Pine forest natural zone
      ctx.fillStyle = '#064e3b25';
      ctx.strokeStyle = '#05966940';
      ctx.lineWidth = 4;
      ctx.fillRect(100, 100, 2600, 2600);
      ctx.strokeRect(100, 100, 2600, 2600);

      // Forest Lake / Pond
      ctx.fillStyle = '#0369a150';
      ctx.strokeStyle = '#38bdf860';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(600, 600, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Central Park Zone
      ctx.fillStyle = '#065f4630';
      ctx.strokeStyle = '#10b98150';
      ctx.lineWidth = 4;
      ctx.fillRect(3700, 2100, 1400, 1400);
      ctx.strokeRect(3700, 2100, 1400, 1400);

      // Central Promenade fountain basin
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4400, 2800, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 3. Roads & Highway Network
      world.roads.forEach((road) => {
        const isHoriz = road.direction === 'horizontal';
        
        // Road surface
        ctx.fillStyle = '#1e293b';
        if (isHoriz) {
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
        } else {
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
        }

        // Sidewalk curbs
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        if (isHoriz) {
          ctx.beginPath();
          ctx.moveTo(road.x1, road.y1 - road.width / 2);
          ctx.lineTo(road.x2, road.y2 - road.width / 2);
          ctx.moveTo(road.x1, road.y1 + road.width / 2);
          ctx.lineTo(road.x2, road.y2 + road.width / 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(road.x1 - road.width / 2, road.y1);
          ctx.lineTo(road.x2 - road.width / 2, road.y2);
          ctx.moveTo(road.x1 + road.width / 2, road.y1);
          ctx.lineTo(road.x2 + road.width / 2, road.y2);
          ctx.stroke();
        }

        // Dashed center road dividers
        ctx.strokeStyle = '#e2e8f030';
        ctx.lineWidth = 2;
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1);
        ctx.lineTo(road.x2, road.y2);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // 4. Intersections & Real-time Signal Lights
      world.intersections.forEach((inter) => {
        const phase = inter.phases[inter.currentPhaseIndex];
        const isGreen = phase.nsState === 'green' || phase.nsState === 'green_flashing';

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(inter.x - inter.width / 2, inter.y - inter.height / 2, inter.width, inter.height);

        // Signal light dot indicator
        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Buildings Vector Footprints (Color coded by archetype)
      world.buildings.forEach((bld) => {
        if (bld.type === 'park_monument') return; // Handled in park section

        if (bld.type === 'office') {
          ctx.fillStyle = '#1e293b90';
          ctx.strokeStyle = '#38bdf850';
        } else if (bld.type === 'shop') {
          ctx.fillStyle = '#0f766e40';
          ctx.strokeStyle = '#14b8a670';
        } else if (bld.type === 'industrial') {
          ctx.fillStyle = '#78350f35';
          ctx.strokeStyle = '#f59e0b50';
        } else {
          ctx.fillStyle = '#1e293b70';
          ctx.strokeStyle = '#64748b60';
        }

        ctx.lineWidth = 1.2;
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
      });

      // 6. Real Parking Lots (🅿️)
      world.parkings.forEach((pk) => {
        ctx.fillStyle = 'rgba(30, 58, 138, 0.25)';
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
        ctx.lineWidth = 2;
        ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
        ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);

        if (zoom > 0.22) {
          ctx.fillStyle = '#60a5fa';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🅿️', pk.x + pk.width / 2, pk.y + pk.height / 2);
        }
      });

      // 7. Active GPS Route Breadcrumbs & Destination
      if (world.gpsPath && world.gpsPath.length > 1) {
        // Outer glowing cyan trail
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = Math.max(6, 12 / Math.max(0.5, zoom));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(world.gpsPath[0].x, world.gpsPath[0].y);
        for (let i = 1; i < world.gpsPath.length; i++) {
          ctx.lineTo(world.gpsPath[i].x, world.gpsPath[i].y);
        }
        ctx.stroke();

        // Inner animated dashed core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2, 4 / Math.max(0.5, zoom));
        const dashOffset = (Date.now() * 0.02) % 24;
        ctx.lineDashOffset = -dashOffset;
        ctx.setLineDash([14, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // GPS Destination Flag Marker
      if (world.gpsDestination) {
        const dest = world.gpsDestination;
        ctx.save();
        ctx.translate(dest.x, dest.y);

        // Pulse ring
        const flagPulse = (Date.now() % 1600) / 1600;
        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - flagPulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 15 + flagPulse * 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩', 0, -2);
        ctx.restore();
      }

      // 8. AI Traffic Vehicles & Pedestrians (Crisp Vector Dots)
      world.vehicles.forEach((veh) => {
        if (veh.isPlayerControlled) return;
        ctx.save();
        ctx.translate(veh.x, veh.y);
        ctx.rotate(veh.angle);
        
        ctx.fillStyle = veh.isParked ? '#64748b' : '#f59e0b';
        ctx.fillRect(-10, -5, 20, 10);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -5, 20, 10);
        ctx.restore();
      });

      if (zoom > 0.4) {
        ctx.fillStyle = '#c084fc';
        world.pedestrians.forEach((ped) => {
          ctx.beginPath();
          ctx.arc(ped.x, ped.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 9. Real City Landmarks & POI Badges
      REAL_LANDMARKS.forEach((lm) => {
        const isSel = selectedLandmark?.id === lm.id;

        // Selection / Hover Halo
        ctx.fillStyle = isSel ? 'rgba(16, 185, 129, 0.25)' : 'rgba(56, 189, 248, 0.12)';
        ctx.strokeStyle = isSel ? '#10b981' : '#38bdf888';
        ctx.lineWidth = isSel ? 3 : 1.5;
        ctx.beginPath();
        ctx.arc(lm.x, lm.y, 42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Landmark Icon
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lm.icon, lm.x, lm.y - 4);

        // Landmark Label Pill
        ctx.font = 'bold 13px sans-serif';
        const textMetrics = ctx.measureText(lm.nameRu);
        const pWidth = textMetrics.width + 18;
        const pHeight = 22;

        ctx.fillStyle = isSel ? '#065f46' : '#0f172aee';
        ctx.strokeStyle = isSel ? '#34d399' : '#334155';
        ctx.lineWidth = 1.2;

        const rx = lm.x - pWidth / 2;
        const ry = lm.y + 20;
        ctx.beginPath();
        safeRoundRect(ctx, rx, ry, pWidth, pHeight, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(lm.nameRu, lm.x, ry + pHeight / 2);
      });

      // 10. PLAYER MARKER (Glow + Direction + Heading Arrow)
      ctx.save();
      ctx.translate(player.x, player.y);

      // Animated Pulse Ring
      const pulse = (Date.now() % 1400) / 1400;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + pulse * 32, 0, Math.PI * 2);
      ctx.stroke();

      // Heading Arrow
      ctx.rotate(player.angle);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // "ВЫ ЗДЕСЬ" Tag above player
      ctx.font = 'bold 13px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('📍 ВЫ ЗДЕСЬ', player.x, player.y - 28);

      ctx.restore();

      animId = requestAnimationFrame(renderMap);
    };

    renderMap();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, world, player, zoom, panOffset, selectedLandmark]);

  // --- MOUSE EVENT HANDLERS (Desktop) ---
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

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    const distMoved = Math.hypot(e.clientX - dragStartRef.current.x, e.clientY - dragStartRef.current.y);
    if (distMoved < 6) {
      handleMapClick(e.clientX, e.clientY);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    handleZoomAtPoint(zoomFactor, e.clientX, e.clientY);
  };

  // --- TOUCH EVENT HANDLERS (Full Mobile Support: Drag, Pinch-to-Zoom, Tap) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    touchStartTimeRef.current = Date.now();
    
    const touchList = Array.from(e.touches).map((t: React.Touch) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));
    touchesRef.current = touchList;

    if (touchList.length === 1) {
      dragStartRef.current = { x: touchList[0].x, y: touchList[0].y };
      panStartRef.current = { ...panOffset };
      setIsDragging(true);
    } else if (touchList.length >= 2) {
      const t1 = touchList[0];
      const t2 = touchList[1];
      initialPinchDistRef.current = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      initialZoomRef.current = zoom;
      panStartRef.current = { ...panOffset };
      dragStartRef.current = { x: (t1.x + t2.x) / 2, y: (t1.y + t2.y) / 2 };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touchList = Array.from(e.touches).map((t: React.Touch) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));

    if (touchList.length === 1) {
      const dx = touchList[0].x - dragStartRef.current.x;
      const dy = touchList[0].y - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    } else if (touchList.length >= 2) {
      const t1 = touchList[0];
      const t2 = touchList[1];
      const currentDist = Math.hypot(t1.x - t2.x, t1.y - t2.y);
      if (initialPinchDistRef.current > 0) {
        const factor = currentDist / initialPinchDistRef.current;
        const midX = (t1.x + t2.x) / 2;
        const midY = (t1.y + t2.y) / 2;
        
        const newZoom = Math.max(0.12, Math.min(2.8, initialZoomRef.current * factor));
        const wx = (midX - panStartRef.current.x) / initialZoomRef.current;
        const wy = (midY - panStartRef.current.y) / initialZoomRef.current;

        setZoom(newZoom);
        setPanOffset({
          x: midX - wx * newZoom,
          y: midY - wy * newZoom,
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    const endedTouches = Array.from(e.changedTouches) as React.Touch[];
    const duration = Date.now() - touchStartTimeRef.current;

    if (touchesRef.current.length === 1 && endedTouches.length > 0) {
      const touch = endedTouches[0];
      const dist = Math.hypot(touch.clientX - dragStartRef.current.x, touch.clientY - dragStartRef.current.y);
      if (dist < 12 && duration < 350) {
        handleMapClick(touch.clientX, touch.clientY);
      }
    }

    touchesRef.current = Array.from(e.touches).map((t: React.Touch) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY
    }));
    if (touchesRef.current.length === 0) {
      setIsDragging(false);
    }
  };

  // --- MAP CLICK / TAP LOGIC (Place GPS or Select Landmark) ---
  const handleMapClick = (screenX: number, screenY: number) => {
    const worldX = (screenX - panOffset.x) / zoom;
    const worldY = (screenY - panOffset.y) / zoom;

    // 1. Check if clicked near a city landmark
    let foundLandmark: CityLandmark | null = null;
    for (const lm of REAL_LANDMARKS) {
      const dist = Math.hypot(lm.x - worldX, lm.y - worldY);
      if (dist < 80) {
        foundLandmark = lm;
        break;
      }
    }

    if (foundLandmark) {
      setSelectedLandmark(foundLandmark);
      onSetGpsTarget({ x: foundLandmark.x, y: foundLandmark.y, name: foundLandmark.nameRu });
      return;
    }

    // 2. Check if clicked near a parking lot
    let foundParking = false;
    if (world) {
      for (const pk of world.parkings) {
        const pkCenterX = pk.x + pk.width / 2;
        const pkCenterY = pk.y + pk.height / 2;
        if (Math.hypot(pkCenterX - worldX, pkCenterY - worldY) < 70) {
          setSelectedLandmark({
            id: `parking_${pk.x}_${pk.y}`,
            name: 'Public Parking',
            nameRu: 'Городская Автостоянка',
            category: 'parking',
            x: pkCenterX,
            y: pkCenterY,
            icon: '🅿️',
            description: 'Парковочный комплекс с размеченными стояночными местами'
          });
          onSetGpsTarget({ x: pkCenterX, y: pkCenterY, name: 'Автостоянка 🅿️' });
          foundParking = true;
          break;
        }
      }
    }

    if (!foundParking) {
      setSelectedLandmark(null);
      // Place arbitrary custom GPS point
      onSetGpsTarget({
        x: Math.round(worldX),
        y: Math.round(worldY),
        name: 'Пользовательская метка'
      });
    }
  };

  // Teleport handler matching SpawnLocation structure
  const handleTeleportToSelected = () => {
    if (!selectedLandmark) return;
    const matchedSpawn = SPAWN_LOCATIONS.find((s) => s.id === selectedLandmark.id) || {
      id: selectedLandmark.id,
      name: selectedLandmark.name,
      nameRu: selectedLandmark.nameRu,
      x: selectedLandmark.x,
      y: selectedLandmark.y,
      description: selectedLandmark.description,
      icon: selectedLandmark.icon
    };
    onTeleport(matchedSpawn);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col font-sans select-none animate-in fade-in duration-150 touch-none">
      {/* MAP CANVAS (Supports Desktop Mouse & Mobile Touches) */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`w-full h-full block touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      />

      {/* TOP HEADER (Adaptive Mobile / Desktop) */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none gap-2">
        {/* District & Location Badge */}
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl px-3 sm:px-4 py-2 shadow-2xl flex items-center gap-3 pointer-events-auto max-w-[70vw] sm:max-w-md">
          <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 shrink-0">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '12s' }} />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">Карта Города</span>
              <span className="hidden sm:inline text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">[M] Закрыть</span>
            </div>
            <h2 className="text-white font-bold text-sm sm:text-base truncate">{streetName}</h2>
          </div>
        </div>

        {/* GPS Active Target Badge & Close Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {world?.gpsDestination && (
            <div className="bg-sky-950/95 backdrop-blur-md border border-sky-400/60 rounded-2xl px-3 py-1.5 shadow-2xl flex items-center gap-2 text-white text-xs">
              <span className="text-base">🚩</span>
              <div className="hidden sm:flex flex-col">
                <span className="font-bold text-sky-300 truncate max-w-[120px]">
                  {world.gpsDestination.name || 'Маршрут'}
                </span>
                <span className="text-[10px] text-slate-300">
                  {Math.round(Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y))} м
                </span>
              </div>
              <button
                onClick={() => onSetGpsTarget(null)}
                className="p-1 hover:bg-sky-800 rounded-lg text-sky-200 hover:text-white transition-all"
                title="Сбросить маршрут"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            id="btn-close-map"
            onClick={onClose}
            className="bg-slate-900/95 hover:bg-slate-800 active:scale-95 border border-slate-700 text-slate-200 p-2.5 sm:p-3 rounded-2xl shadow-2xl transition-all"
            title="Закрыть карту"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* RIGHT SIDEBAR: ZOOM & POSITION TOUCH CONTROLS */}
      <div className="absolute top-20 right-3 z-10 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => handleZoom(0.15)}
          className="bg-slate-900/90 active:bg-slate-800 border border-slate-700 text-white p-3 rounded-xl shadow-xl transition-all"
          title="Приблизить"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom(-0.15)}
          className="bg-slate-900/90 active:bg-slate-800 border border-slate-700 text-white p-3 rounded-xl shadow-xl transition-all"
          title="Отдалить"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={centerOnPlayer}
          className="bg-sky-950/90 active:bg-sky-900 border border-sky-500/50 text-sky-300 p-3 rounded-xl shadow-xl transition-all"
          title="Центрировать на игроке"
        >
          <Crosshair className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setZoom(0.35);
            centerOnPlayer();
          }}
          className="bg-slate-900/90 active:bg-slate-800 border border-slate-700 text-slate-300 p-3 rounded-xl shadow-xl transition-all"
          title="Обзор всего города"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* SELECTED POI / TELEPORT / GPS CARD */}
      {selectedLandmark && (
        <div className="absolute bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-20 bg-slate-900/95 backdrop-blur-md border border-sky-500/60 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center gap-3 text-white max-w-lg animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-3xl select-none">{selectedLandmark.icon}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-sky-300 truncate">{selectedLandmark.nameRu}</h3>
              <p className="text-xs text-slate-300 line-clamp-1">{selectedLandmark.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                onSetGpsTarget({
                  x: selectedLandmark.x,
                  y: selectedLandmark.y,
                  name: selectedLandmark.nameRu
                });
                onClose();
              }}
              className="flex-1 sm:flex-initial px-3 py-2 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1 text-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Маршрут</span>
            </button>
            <button
              onClick={handleTeleportToSelected}
              className="flex-1 sm:flex-initial px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1 text-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Телепорт</span>
            </button>
          </div>
        </div>
      )}

      {/* MAP LEGEND OVERLAY (Bottom-left) */}
      <div className="absolute bottom-4 left-3 z-10 pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl text-xs text-slate-300 max-w-[200px] sm:max-w-xs">
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className="font-bold text-slate-200 flex items-center justify-between w-full gap-2 text-xs"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Обозначения</span>
            </span>
            <span className="text-[10px] text-slate-400">{showLegend ? 'Скрыть ▲' : 'Показать ▼'}</span>
          </button>

          {showLegend && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
                <span>Вы (Игрок)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>AI-Трафик</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Светофоры</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🅿️</span>
                <span>Парковки</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>⛲</span>
                <span>Фонтан & Парк</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🚩</span>
                <span>GPS Маршрут</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

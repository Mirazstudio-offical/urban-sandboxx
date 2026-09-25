import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, GameWorld, Player } from '../types';
import { SPAWN_LOCATIONS, SpawnLocation } from '../App';
import { isVehicleInAccident } from '../navigation';
import { CITY_SHOPS, CityShop } from './ShopModal';
import { RIVER_WAYPOINTS } from '../riverSystem';
import { 
  TreePine, 
  Building2, 
  Home, 
  Truck, 
  Map, 
  Navigation, 
  Compass, 
  Crosshair, 
  MapPin, 
  Minus, 
  Plus, 
  RotateCcw, 
  X,
  Zap,
  Layers,
  Search,
  Wrench,
  HeartPulse,
  Shield,
  Flame,
  Fuel,
  ShoppingBag,
  Utensils,
  Pill,
  Mountain,
  Car,
  Filter,
  ChevronRight,
  LocateFixed,
  ArrowUpRight,
  TrainTrack
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

// Safe canvas roundRect helper to prevent IndexSizeError DOMExceptions
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
      // Fall through to manual path
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export type LandmarkCategory = 'spawns' | 'gas_stations' | 'services' | 'shops' | 'nature' | 'industrial';

export type LandmarkIconKey = 
  | 'car' 
  | 'hospital' 
  | 'police' 
  | 'fire' 
  | 'mall' 
  | 'garage' 
  | 'fuel' 
  | 'food' 
  | 'pharmacy' 
  | 'nature' 
  | 'mountain' 
  | 'industrial' 
  | 'agency'
  | 'train'
  | 'spawn' 
  | 'all';

export interface CityLandmark {
  id: string;
  name: string;
  nameRu: string;
  category: LandmarkCategory;
  x: number;
  y: number;
  iconKey: LandmarkIconKey;
  badgeColor: string;
  description: string;
  spawnLoc?: SpawnLocation;
}

export const LandmarkIcon: React.FC<{ iconKey: LandmarkIconKey; className?: string }> = ({ iconKey, className = "w-4 h-4" }) => {
  switch (iconKey) {
    case 'car': return <Car className={className} />;
    case 'hospital': return <HeartPulse className={className} />;
    case 'police': return <Shield className={className} />;
    case 'fire': return <Flame className={className} />;
    case 'mall': return <ShoppingBag className={className} />;
    case 'garage': return <Wrench className={className} />;
    case 'fuel': return <Fuel className={className} />;
    case 'food': return <Utensils className={className} />;
    case 'pharmacy': return <Pill className={className} />;
    case 'nature': return <TreePine className={className} />;
    case 'mountain': return <Mountain className={className} />;
    case 'industrial': return <Truck className={className} />;
    case 'agency': return <Building2 className={className} />;
    case 'train': return <TrainTrack className={className} />;
    case 'all': return <Map className={className} />;
    case 'spawn':
    default:
      return <MapPin className={className} />;
  }
};

function formatDistance(distMeters: number): string {
  if (distMeters >= 1000) {
    return `${(distMeters / 1000).toFixed(1)} км`;
  }
  return `${Math.round(distMeters)} м`;
}

function formatEta(distMeters: number): string {
  const seconds = distMeters / 13.8; // ~50 km/h average drive speed
  if (seconds < 60) {
    return `${Math.round(seconds)} сек`;
  }
  const mins = Math.round(seconds / 60);
  return `~${mins} мин`;
}

/**
 * Draws crisp vector icon graphics on Canvas directly inside marker pin badges
 */
function drawLandmarkIconOnCanvas(
  ctx: CanvasRenderingContext2D,
  iconKey: LandmarkIconKey,
  radius: number,
  zoom: number
) {
  const s = Math.max(0.6, (radius * 0.55) / Math.max(0.3, zoom));
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.2, 2 / zoom);

  switch (iconKey) {
    case 'hospital': {
      const w = s * 0.35;
      const h = s * 1.1;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.fillRect(-h / 2, -w / 2, h, w);
      break;
    }
    case 'fuel': {
      const w = s * 0.7;
      const h = s * 1.0;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.fillRect(-w / 4, -h / 3, w / 2, h / 3);
      break;
    }
    case 'police': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.7);
      ctx.lineTo(s * 0.6, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.4);
      ctx.lineTo(0, s * 0.8);
      ctx.lineTo(-s * 0.5, s * 0.4);
      ctx.lineTo(-s * 0.6, -s * 0.4);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'fire': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.quadraticCurveTo(s * 0.7, 0, s * 0.4, s * 0.7);
      ctx.quadraticCurveTo(0, s * 0.9, -s * 0.4, s * 0.7);
      ctx.quadraticCurveTo(-s * 0.7, 0, 0, -s * 0.8);
      ctx.fill();
      break;
    }
    case 'car': {
      ctx.beginPath();
      ctx.fillRect(-s * 0.8, -s * 0.2, s * 1.6, s * 0.6);
      ctx.fillRect(-s * 0.5, -s * 0.5, s * 1.0, s * 0.4);
      break;
    }
    case 'garage': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, s * 0.5);
      ctx.lineTo(s * 0.5, -s * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(s * 0.4, -s * 0.4, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'nature': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.6, s * 0.3);
      ctx.lineTo(-s * 0.6, s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(-s * 0.15, s * 0.3, s * 0.3, s * 0.35);
      break;
    }
    case 'mall':
    case 'food': {
      ctx.strokeRect(-s * 0.6, -s * 0.2, s * 1.2, s * 0.9);
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.3, Math.PI, 0);
      ctx.stroke();
      break;
    }
    case 'industrial': {
      ctx.fillRect(-s * 0.8, -s * 0.4, s * 1.0, s * 0.8);
      ctx.strokeRect(s * 0.2, -s * 0.2, s * 0.5, s * 0.6);
      break;
    }
    case 'agency': {
      ctx.strokeRect(-s * 0.5, -s * 0.2, s * 1.0, s * 0.8);
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.2);
      ctx.lineTo(0, -s * 0.7);
      ctx.lineTo(s * 0.6, -s * 0.2);
      ctx.closePath();
      ctx.stroke();
      break;
    }
    case 'train': {
      // Rails and ties
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.6);
      ctx.lineTo(-s * 0.6, s * 0.6);
      ctx.moveTo(s * 0.6, -s * 0.6);
      ctx.lineTo(s * 0.6, s * 0.6);
      ctx.moveTo(-s * 0.8, -s * 0.3);
      ctx.lineTo(s * 0.8, -s * 0.3);
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.moveTo(-s * 0.8, s * 0.3);
      ctx.lineTo(s * 0.8, s * 0.3);
      ctx.stroke();
      break;
    }
    case 'spawn':
    default: {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

/**
 * Dynamically resolves real landmark positions from actual physical buildings and map objects
 * sitting in gameWorld, avoiding duplicate pins and ensuring pins land on exact buildings.
 */
export function resolveWorldLandmarks(world: GameWorld | null): CityLandmark[] {
  const landmarks: CityLandmark[] = [];
  const addedIds = new Set<string>();

  if (world && world.buildings) {
    for (const bld of world.buildings) {
      const cx = Math.round(bld.x + bld.width / 2);
      const cy = Math.round(bld.y + bld.height / 2);

      if (bld.type === 'real_estate_agency' || bld.id === 'bld_real_estate_agency_main' || (bld.nameRu && bld.nameRu.includes('ГлавНедвижимость'))) {
        landmarks.push({
          id: 'bld_real_estate_agency',
          name: 'Real Estate Agency GlavNedvizhimost',
          nameRu: 'Агентство Недвижимости «ГлавНедвижимость»',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'agency',
          badgeColor: '#eab308',
          description: 'Официальное агентство недвижимости & Росреестр: каталог квартир, выписки ЕГРН и ключи',
          spawnLoc: { id: 'real_estate_agency_loc', name: 'Real Estate Agency', nameRu: 'Агентство Недвижимости «ГлавНедвижимость»', x: cx, y: cy + 60, description: '', icon: null }
        });
        addedIds.add('real_estate_agency_loc');
        addedIds.add('real_estate_agency');
      } else if (bld.type === 'car_dealership') {
        landmarks.push({
          id: 'bld_car_dealership',
          name: 'Car Dealership & Showroom',
          nameRu: 'Автосалон "Премиум Авто"',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'car',
          badgeColor: '#d97706',
          description: 'Официальный автосалон: выставка авто, покупка с ПТС и выбор цвета',
          spawnLoc: { id: 'car_dealership_loc', name: 'Car Dealership', nameRu: 'Автосалон "Премиум Авто"', x: cx, y: cy + 40, description: '', icon: null }
        });
        addedIds.add('car_dealership_loc');
        addedIds.add('car_dealership');
      } else if (bld.type === 'hospital' || (bld.nameRu && bld.nameRu.includes('Больница'))) {
        landmarks.push({
          id: 'bld_hospital',
          name: 'City Emergency Hospital',
          nameRu: bld.nameRu || 'Городская Больница №1',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'hospital',
          badgeColor: '#e11d48',
          description: 'Круглосуточный медицинский комплекс, травматология и реанимация'
        });
        addedIds.add('hospital_city_1');
      } else if (bld.type === 'police_station' || (bld.nameRu && (bld.nameRu.includes('Полиция') || bld.nameRu.includes('УВД')))) {
        landmarks.push({
          id: 'bld_police',
          name: 'Central Police Precinct',
          nameRu: bld.nameRu || 'УВД / Полицейский Участок',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'police',
          badgeColor: '#1d4ed8',
          description: 'Городское управление внутренних дел и патрульная автостоянка'
        });
        addedIds.add('police_station_loc');
      } else if (bld.type === 'fire_station' || (bld.nameRu && bld.nameRu.includes('Пожарная'))) {
        landmarks.push({
          id: 'bld_fire_station',
          name: 'Fire Station #12',
          nameRu: bld.nameRu || 'Пожарная Часть №12',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'fire',
          badgeColor: '#dc2626',
          description: 'Депо МЧС, пожарные машины КАМАЗ и спасательное оборудование'
        });
        addedIds.add('fire_station_loc');
      } else if (bld.type === 'shopping_mall' || (bld.nameRu && (bld.nameRu.includes('ТРЦ') || bld.nameRu.includes('Галерея')))) {
        landmarks.push({
          id: 'bld_mall',
          name: 'Gallery Shopping Mall',
          nameRu: bld.nameRu || 'ТРЦ «Галерея»',
          category: 'shops',
          x: cx,
          y: cy,
          iconKey: 'mall',
          badgeColor: '#9333ea',
          description: 'Крупный Торгово-Развлекательный Центр: продукты, электроника, одежда'
        });
        addedIds.add('gallery_mall_loc');
      } else if ((bld.type && bld.type.startsWith('garage_')) || (bld.nameRu && bld.nameRu.includes('Гараж'))) {
        landmarks.push({
          id: 'bld_garage_coop',
          name: 'Garage Cooperative Vostok-1',
          nameRu: bld.nameRu || 'Гаражный Кооператив «Восток-1»',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'garage',
          badgeColor: '#64748b',
          description: 'Массив частных кирпичных гаражей, ремонтные ямы и эстакады'
        });
        addedIds.add('garage_coop_loc');
      } else if (bld.type === 'railway_station' || (bld.nameRu && bld.nameRu.includes('Вокзал'))) {
        landmarks.push({
          id: 'bld_railway_station_loc',
          name: 'Stepnaya Railway Station',
          nameRu: bld.nameRu || 'Ж/Д Вокзал «Степная»',
          category: 'services',
          x: cx,
          y: cy,
          iconKey: 'train',
          badgeColor: '#0284c7',
          description: 'Пассажирский железнодорожный вокзал, выход к платформам и залу ожидания'
        });
        addedIds.add('railway_station_loc');
      }
    }
  }

  // Add Gas Station landmark if present in world
  if (world && (world as any).gasStation) {
    const gs = (world as any).gasStation;
    landmarks.push({
      id: 'gas_station_main_loc',
      name: 'Grand-Oil Gas Station 24/7',
      nameRu: 'АЗС «Гранд-Ойл» (24/7)',
      category: 'gas_stations',
      x: gs.x,
      y: gs.y,
      iconKey: 'fuel',
      badgeColor: '#2563eb',
      description: 'Заправка всех видов топлива (АИ-92, 95, 98, ДТ, СУГ) и кафе'
    });
    addedIds.add('gas_station_main_loc');
  }

  // Add CITY_SHOPS
  for (const s of CITY_SHOPS) {
    if (addedIds.has(s.id)) continue;
    let cat: LandmarkCategory = 'shops';
    let iconKey: LandmarkIconKey = 'mall';

    if (s.type === 'gas_station_shop') {
      cat = 'gas_stations';
      iconKey = 'fuel';
    } else if (s.type === 'auto_shop') {
      cat = 'services';
      iconKey = 'garage';
    } else if (s.type === 'pharmacy') {
      cat = 'services';
      iconKey = 'pharmacy';
    } else if (s.type === 'gear_shop') {
      cat = 'shops';
      iconKey = 'nature';
    } else if (['fast_food', 'pizzeria', 'sushi_asian', 'cinema_bar'].includes(s.type)) {
      cat = 'shops';
      iconKey = 'food';
    } else if (s.type === 'car_dealership') {
      cat = 'services';
      iconKey = 'car';
    }

    // Snap shop to exact building if within 80px
    let px = s.x;
    let py = s.y;
    if (world && world.buildings) {
      const matchedBld = world.buildings.find(b => 
        s.x >= b.x - 30 && s.x <= b.x + b.width + 30 &&
        s.y >= b.y - 30 && s.y <= b.y + b.height + 30
      );
      if (matchedBld) {
        px = Math.round(matchedBld.x + matchedBld.width / 2);
        py = Math.round(matchedBld.y + matchedBld.height / 2);
      }
    }

    // Deduplicate against existing landmarks within 60px
    const existing = landmarks.find(l => Math.hypot(l.x - px, l.y - py) < 60);
    if (!existing) {
      landmarks.push({
        id: s.id,
        name: s.nameRu,
        nameRu: s.nameRu,
        category: cat,
        x: px,
        y: py,
        iconKey: iconKey,
        badgeColor: s.badgeColor || '#9333ea',
        description: s.description
      });
      addedIds.add(s.id);
    }
  }

  // Add SPAWN_LOCATIONS & Outskirts/Highways
  for (const sp of SPAWN_LOCATIONS) {
    if (addedIds.has(sp.id)) continue;
    const existing = landmarks.find(l => Math.hypot(l.x - sp.x, l.y - sp.y) < 100);
    if (existing) continue;

    let cat: LandmarkCategory = 'spawns';
    let iconKey: LandmarkIconKey = 'spawn';
    let color = '#0284c7';

    if (sp.id.includes('park') || sp.id.includes('forest')) {
      cat = 'nature';
      iconKey = 'nature';
      color = '#059669';
    } else if (sp.id.includes('industrial')) {
      cat = 'industrial';
      iconKey = 'industrial';
      color = '#475569';
    } else if (sp.id.includes('cottage') || sp.id.includes('village')) {
      cat = 'nature';
      iconKey = 'nature';
      color = '#15803d';
    } else if (sp.id.includes('highway') || sp.id.includes('pass') || sp.id.includes('canyon') || sp.id.includes('dunes') || sp.id.includes('hub')) {
      cat = 'nature';
      iconKey = 'mountain';
      color = '#ea580c';
    }

    landmarks.push({
      id: sp.id,
      name: sp.name,
      nameRu: sp.nameRu,
      category: cat,
      x: sp.x,
      y: sp.y,
      iconKey: iconKey,
      badgeColor: color,
      description: sp.description,
      spawnLoc: sp
    });
    addedIds.add(sp.id);
  }

  return landmarks;
}

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

  // Viewport Panning & Zooming
  const [zoom, setZoom] = useState<number>(0.35);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Touch tracking for pinch zoom & double tap
  const touchesRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const initialPinchDistRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(0.35);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // POI & Search state
  const [selectedLandmark, setSelectedLandmark] = useState<CityLandmark | null>(null);
  const [hoveredLandmarkId, setHoveredLandmarkId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LandmarkCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);

  // Compute clean deduplicated landmarks
  const allLandmarks = useMemo(() => resolveWorldLandmarks(world), [world]);

  // Filter landmarks
  const filteredLandmarks = useMemo(() => {
    return allLandmarks.filter((lm) => {
      if (activeCategory !== 'all' && lm.category !== activeCategory) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return lm.nameRu.toLowerCase().includes(q) || lm.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allLandmarks, activeCategory, searchQuery]);

  // Stable references for high-speed 60 FPS animation loop without React state thrashing
  const playerRef = useRef(player);
  playerRef.current = player;
  const worldRef = useRef(world);
  worldRef.current = world;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const selectedLandmarkRef = useRef(selectedLandmark);
  selectedLandmarkRef.current = selectedLandmark;
  const hoveredLandmarkIdRef = useRef(hoveredLandmarkId);
  hoveredLandmarkIdRef.current = hoveredLandmarkId;
  const filteredLandmarksRef = useRef(filteredLandmarks);
  filteredLandmarksRef.current = filteredLandmarks;

  // Center pan on player position when map opens
  useEffect(() => {
    if (isOpen) {
      centerOnPlayer();
    }
  }, [isOpen]);

  const centerOnPlayer = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPanOffset({
      x: w / 2 - player.x * zoom,
      y: h / 2 - player.y * zoom,
    });
  };

  const centerOnLocation = (x: number, y: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPanOffset({
      x: w / 2 - x * zoom,
      y: h / 2 - y * zoom,
    });
  };

  const handleZoomAtPoint = (factor: number, screenX: number, screenY: number) => {
    setZoom((prevZoom) => {
      const newZoom = Math.max(0.06, Math.min(3.0, prevZoom * factor));
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

  // Keyboard controls
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'KeyM') {
        onClose();
        e.preventDefault();
        return;
      }
      const panStep = 80 / zoom;
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
        handleZoom(0.12);
      }
      if (e.key === '-') {
        handleZoom(-0.12);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoom, onClose]);

  // Hardware Canvas Render Loop (High Performance 60 FPS, Zero DOM Lag, Viewport Culled)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      const targetW = Math.round(w * dpr);
      const targetH = Math.round(h * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const renderMap = () => {
      const world = worldRef.current;
      const player = playerRef.current;
      const zoom = zoomRef.current;
      const panOffset = panOffsetRef.current;
      const filteredLandmarks = filteredLandmarksRef.current;
      const selectedLandmark = selectedLandmarkRef.current;
      const hoveredLandmarkId = hoveredLandmarkIdRef.current;

      if (!world || !player) {
        animId = requestAnimationFrame(renderMap);
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Reset transform and clear canvas
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // DPR scale
      ctx.scale(dpr, dpr);

      // Tech background grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 120 * zoom;
      if (gridSize > 14) {
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

      // Viewport frustum culling boundaries in world coordinates
      const viewMinX = -panOffset.x / zoom - 250;
      const viewMaxX = (w - panOffset.x) / zoom + 250;
      const viewMinY = -panOffset.y / zoom - 250;
      const viewMaxY = (h - panOffset.y) / zoom + 250;

      // 2. Map Boundaries & Natural Ecological Terrain Biomes (Forest Priority)
      const minMapX = -4000;
      const minMapY = -5000;
      const totalMapW = Math.max(56000, world.width + 4000);
      const totalMapH = Math.max(35000, world.height + 5000);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(minMapX, minMapY, totalMapW, totalMapH);

      // Deep Boreal Pine Taiga across the vast North (y: -5000..3400)
      ctx.fillStyle = 'rgba(14, 68, 35, 0.42)';
      ctx.fillRect(minMapX, minMapY, totalMapW, 8400);

      // Western Pine Reserve & Old-Growth Woodland (x: -4000..4200, y: 0..8800)
      ctx.fillStyle = 'rgba(16, 75, 38, 0.34)';
      ctx.fillRect(minMapX, 0, 8200, 8800);

      // Central Countryside Forest-Steppe & Meadows (x: 3800..8000, y: 3400..8400)
      ctx.fillStyle = 'rgba(46, 134, 60, 0.20)';
      ctx.fillRect(3800, 3400, 4400, 5000);

      // Eastern High Steppe (x >= 8000, y: 3400..13000)
      ctx.fillStyle = 'rgba(136, 154, 72, 0.16)';
      ctx.fillRect(8000, 3400, totalMapW - 12000, 9600);

      // Southern Weathered Clay Escarpment Badlands (y >= 13500)
      ctx.fillStyle = 'rgba(122, 98, 76, 0.24)';
      ctx.fillRect(minMapX, 13500, totalMapW, totalMapH - 18500);

      // Salt Lake Basin (x: 17000..35000, y: 7200..8300)
      ctx.fillStyle = 'rgba(14, 116, 144, 0.45)';
      ctx.fillRect(17000, 7200, 18000, 1100);

      // Outer boundary border
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 16;
      ctx.strokeRect(minMapX, minMapY, totalMapW, totalMapH);

      // Pine Forest Reserve Core Landmark Zone
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(100, 100, 3600, 3400, 32);
      ctx.fill();
      ctx.stroke();

      // Forest Lake
      ctx.fillStyle = 'rgba(3, 105, 161, 0.45)';
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(600, 600, 190, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Central Park Zone
      ctx.fillStyle = 'rgba(6, 95, 70, 0.25)';
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 4;
      ctx.fillRect(3700, 2100, 1400, 1400);
      ctx.strokeRect(3700, 2100, 1400, 1400);

      // Central Park Fountain
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4400, 2800, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 3;
      ctx.stroke();

      // River "Быстрица" in northern wilderness
      if (RIVER_WAYPOINTS.length > 1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
        ctx.lineWidth = 140;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(RIVER_WAYPOINTS[0].x, RIVER_WAYPOINTS[0].y);
        for (let i = 1; i < RIVER_WAYPOINTS.length; i++) {
          ctx.lineTo(RIVER_WAYPOINTS[i].x, RIVER_WAYPOINTS[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(RIVER_WAYPOINTS[0].x, RIVER_WAYPOINTS[0].y);
        for (let i = 1; i < RIVER_WAYPOINTS.length; i++) {
          ctx.lineTo(RIVER_WAYPOINTS[i].x, RIVER_WAYPOINTS[i].y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Roads & Highway Infrastructure (Culled to viewport)
      world.roads.forEach((road) => {
        if (road.curvePoints && road.curvePoints.length > 1) {
          const pts = road.curvePoints;
          const n = pts.length;
          const rMinX = (road._minX ?? Math.min(...pts.map(p => p.x))) - road.width;
          const rMaxX = (road._maxX ?? Math.max(...pts.map(p => p.x))) + road.width;
          const rMinY = (road._minY ?? Math.min(...pts.map(p => p.y))) - road.width;
          const rMaxY = (road._maxY ?? Math.max(...pts.map(p => p.y))) + road.width;
          if (rMaxX < viewMinX || rMinX > viewMaxX || rMaxY < viewMinY || rMinY > viewMaxY) return;

          ctx.save();
          ctx.strokeStyle = road.isDirt ? '#553d2c' : (road.isGravel ? '#5d5e62' : '#32343a');
          ctx.lineWidth = road.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < n; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.stroke();

          // Dashed center line
          if (!road.isDirt) {
            ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([14, 10]);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < n; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
          return;
        }

        const minRX = Math.min(road.x1, road.x2) - road.width;
        const maxRX = Math.max(road.x1, road.x2) + road.width;
        const minRY = Math.min(road.y1, road.y2) - road.width;
        const maxRY = Math.max(road.y1, road.y2) + road.width;
        if (maxRX < viewMinX || minRX > viewMaxX || maxRY < viewMinY || minRY > viewMaxY) return;

        const dx = road.x2 - road.x1;
        const dy = road.y2 - road.y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) return;

        ctx.save();
        const angle = Math.atan2(dy, dx);
        ctx.translate(road.x1, road.y1);
        ctx.rotate(angle);

        // Asphalt road surface
        ctx.fillStyle = road.isDirt ? '#553d2c' : (road.isGravel ? '#5d5e62' : '#32343a');
        ctx.fillRect(0, -road.width / 2, len, road.width);

        // Rounded junction caps
        ctx.beginPath();
        ctx.arc(0, 0, road.width / 2, 0, Math.PI * 2);
        ctx.arc(len, 0, road.width / 2, 0, Math.PI * 2);
        ctx.fill();

        // Sidewalk curbs / edges
        if (!road.isDirt) {
          ctx.strokeStyle = '#3a3b3f';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -road.width / 2);
          ctx.lineTo(len, -road.width / 2);
          ctx.moveTo(0, road.width / 2);
          ctx.lineTo(len, road.width / 2);
          ctx.stroke();

          // Dashed road lane divider
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
          ctx.lineWidth = 2;
          ctx.setLineDash([14, 10]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(len, 0);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      });

      // 3b. Railway Superstructure across the steppe (Culled)
      if (world.railwayTracks && world.railwayTracks.length > 0) {
        world.railwayTracks.forEach((track) => {
          if (track.curvePoints && track.curvePoints.length > 1) {
            const pts = track.curvePoints;
            const tMinX = Math.min(...pts.map(p => p.x)) - 25;
            const tMaxX = Math.max(...pts.map(p => p.x)) + 25;
            const tMinY = Math.min(...pts.map(p => p.y)) - 25;
            const tMaxY = Math.max(...pts.map(p => p.y)) + 25;
            if (tMaxX < viewMinX || tMinX > viewMaxX || tMaxY < viewMinY || tMinY > viewMaxY) return;

            const n = pts.length;
            ctx.save();
            ctx.strokeStyle = '#383532';
            ctx.lineWidth = 14;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            return;
          }

          const minTX = Math.min(track.x1, track.x2) - 25;
          const maxTX = Math.max(track.x1, track.x2) + 25;
          const minTY = Math.min(track.y1, track.y2) - 25;
          const maxTY = Math.max(track.y1, track.y2) + 25;
          if (maxTX < viewMinX || minTX > viewMaxX || maxTY < viewMinY || minTY > viewMaxY) return;

          const dx = track.x2 - track.x1;
          const dy = track.y2 - track.y1;
          const len = Math.hypot(dx, dy);
          if (len < 0.5) return;

          ctx.save();
          const angle = Math.atan2(dy, dx);
          ctx.translate(track.x1, track.y1);
          ctx.rotate(angle);

          // Ballast bed
          ctx.fillStyle = '#383532';
          ctx.fillRect(0, -7, len, 14);

          // Rails
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(0, -3, len, 2);
          ctx.fillRect(0, 1, len, 2);

          ctx.restore();
        });
      }

      // 4. Intersections & Real-time Traffic Signals (Culled)
      world.intersections.forEach((inter) => {
        if (inter.x + inter.width < viewMinX || inter.x - inter.width > viewMaxX || inter.y + inter.height < viewMinY || inter.y - inter.height > viewMaxY) return;

        const phase = inter.phases?.[inter.currentPhaseIndex] || inter.phases?.[0];
        const isGreen = phase ? (phase.nsState === 'green' || phase.nsState === 'green_flashing') : false;

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(inter.x - inter.width / 2, inter.y - inter.height / 2, inter.width, inter.height);

        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 8, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Buildings Vector Footprints with Elevated Roof Bevel Depth (Culled)
      world.buildings.forEach((bld) => {
        if (bld.type === 'park_monument') return;
        if (bld.x + bld.width < viewMinX || bld.x > viewMaxX || bld.y + bld.height < viewMinY || bld.y > viewMaxY) return;

        let fillStyle = 'rgba(30, 41, 59, 0.85)';
        let strokeStyle = 'rgba(71, 85, 105, 0.6)';

        if (bld.type === 'car_dealership') {
          fillStyle = 'rgba(234, 179, 8, 0.25)';
          strokeStyle = '#eab308';
        } else if (bld.type === 'hospital') {
          fillStyle = 'rgba(225, 29, 72, 0.25)';
          strokeStyle = '#f43f5e';
        } else if (bld.type === 'police_station') {
          fillStyle = 'rgba(29, 78, 216, 0.25)';
          strokeStyle = '#3b82f6';
        } else if (bld.type === 'fire_station') {
          fillStyle = 'rgba(220, 38, 38, 0.25)';
          strokeStyle = '#ef4444';
        } else if (bld.type === 'office' || bld.type === 'business_center') {
          fillStyle = 'rgba(30, 41, 59, 0.9)';
          strokeStyle = 'rgba(56, 189, 248, 0.4)';
        } else if (bld.type === 'shop' || bld.type === 'shopping_mall') {
          fillStyle = 'rgba(15, 118, 110, 0.3)';
          strokeStyle = 'rgba(20, 184, 166, 0.6)';
        } else if (bld.type === 'industrial') {
          fillStyle = 'rgba(120, 53, 15, 0.3)';
          strokeStyle = 'rgba(245, 158, 11, 0.5)';
        } else if (bld.type === 'railway_station') {
          fillStyle = 'rgba(2, 132, 199, 0.35)';
          strokeStyle = '#0284c7';
        }

        // Draw 3D shadow/base
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(bld.x + 3, bld.y + 3, bld.width, bld.height);

        // Draw roof body
        ctx.fillStyle = fillStyle;
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.5;
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
      });

      // 6. Parking Lots (P) (Culled)
      world.parkings.forEach((pk) => {
        if (pk.x + pk.width < viewMinX || pk.x > viewMaxX || pk.y + pk.height < viewMinY || pk.y > viewMaxY) return;

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
          ctx.fillText('P', pk.x + pk.width / 2, pk.y + pk.height / 2);
        }
      });

      // 7. Modern Mobile GPS Navigation Polyline & Directional Chevrons
      if (world.gpsPath && world.gpsPath.length > 1) {
        const pts = world.gpsPath;
        const n = pts.length;

        ctx.save();
        // Outer cyan glow line
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.35)';
        ctx.lineWidth = Math.max(12, 24 / Math.max(0.3, zoom));
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Main vibrant navigation line
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = Math.max(7, 14 / Math.max(0.3, zoom));
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Inner bright cyan core
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(3.5, 7 / Math.max(0.3, zoom));
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();

        // Animated white directional dashes moving along route
        const dashOffset = (-Date.now() / 25) % 40;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(2.5, 5 / Math.max(0.3, zoom));
        ctx.setLineDash([14, 26]);
        ctx.lineDashOffset = dashOffset;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < n; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      }

      // GPS Target Marker (Clean vector target icon on Canvas)
      if (world.gpsDestination) {
        const dest = world.gpsDestination;
        const pulse = (Date.now() % 1200) / 1200;

        ctx.save();
        ctx.translate(dest.x, dest.y);

        ctx.strokeStyle = `rgba(239, 68, 68, ${1 - pulse})`;
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, (20 + pulse * 25) / zoom, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(0, 0, 16 / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Target crosshair vector icon
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 / zoom;
        ctx.beginPath();
        ctx.moveTo(-7 / zoom, 0);
        ctx.lineTo(7 / zoom, 0);
        ctx.moveTo(0, -7 / zoom);
        ctx.lineTo(0, 7 / zoom);
        ctx.stroke();

        ctx.restore();
      }

      // 8. Live AI Traffic & Vehicles (Culled)
      world.vehicles.forEach((veh) => {
        if (veh.isPlayerControlled) return;
        if (veh.x < viewMinX || veh.x > viewMaxX || veh.y < viewMinY || veh.y > viewMaxY) return;

        const inAccident = isVehicleInAccident(veh);
        const inJam = !inAccident && !veh.isParked && (Math.abs(veh.speed) < 15 || veh.aiState === 'stopping_obstacle');

        ctx.save();
        ctx.translate(veh.x, veh.y);

        if (inAccident) {
          const pulse = (Date.now() % 1000) / 1000;
          ctx.strokeStyle = `rgba(239, 68, 68, ${0.8 - pulse * 0.7})`;
          ctx.lineWidth = 2 / zoom;
          ctx.beginPath();
          ctx.arc(0, 0, (14 + pulse * 12) / zoom, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.rotate(veh.angle);
        
        if (inAccident) {
          ctx.fillStyle = '#ef4444';
        } else if (inJam) {
          ctx.fillStyle = '#dc2626';
        } else if (veh.isParked) {
          ctx.fillStyle = '#64748b';
        } else {
          ctx.fillStyle = '#f59e0b';
        }

        ctx.fillRect(-10, -5, 20, 10);
        ctx.strokeStyle = inAccident ? '#fecaca' : '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(-10, -5, 20, 10);
        ctx.restore();
      });

      // Pedestrians at close zoom (Culled)
      if (zoom > 0.45) {
        ctx.fillStyle = '#c084fc';
        world.pedestrians.forEach((ped) => {
          if (ped.x < viewMinX || ped.x > viewMaxX || ped.y < viewMinY || ped.y > viewMaxY) return;
          ctx.beginPath();
          ctx.arc(ped.x, ped.y, 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // 9. PLAYER MARKER
      ctx.save();
      ctx.translate(player.x, player.y);

      const pPulse = (Date.now() % 1400) / 1400;
      ctx.strokeStyle = `rgba(56, 189, 248, ${1 - pPulse})`;
      ctx.lineWidth = 3 / zoom;
      ctx.beginPath();
      ctx.arc(0, 0, (16 + pPulse * 30) / zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.rotate(player.angle);
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5 / zoom;

      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-12, -12);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-12, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      if (zoom > 0.18) {
        ctx.font = `bold ${Math.round(13 / zoom)}px sans-serif`;
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText('ВЫ ЗДЕСЬ', player.x, player.y - 28 / zoom);
      }

      // 10. DRAW CANVAS POI MARKERS (Zero DOM lag, scale-dependent clean pins)
      const visibleLandmarks = filteredLandmarks.filter(lm => {
        const sx = lm.x * zoom + panOffset.x;
        const sy = lm.y * zoom + panOffset.y;
        return sx >= -100 && sx <= w + 100 && sy >= -100 && sy <= h + 100;
      });

      for (const lm of visibleLandmarks) {
        const isSelected = selectedLandmark?.id === lm.id;
        const isHovered = hoveredLandmarkId === lm.id;

        const pinRadius = isSelected ? 16 : (isHovered ? 14 : 11);

        ctx.save();
        ctx.translate(lm.x, lm.y);

        // Selection pulsing ring
        if (isSelected) {
          const pulse = (Date.now() % 1200) / 1200;
          ctx.strokeStyle = `rgba(245, 158, 11, ${0.9 - pulse * 0.7})`;
          ctx.lineWidth = 3.5 / zoom;
          ctx.beginPath();
          ctx.arc(0, 0, (pinRadius + 10 + pulse * 14) / zoom, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw pin badge circle
        ctx.fillStyle = lm.badgeColor;
        ctx.strokeStyle = isSelected ? '#ffffff' : '#0f172a';
        ctx.lineWidth = (isSelected ? 3.5 : 2) / zoom;

        ctx.beginPath();
        ctx.arc(0, 0, pinRadius / zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw Crisp Vector Icon inside center of pin badge on Canvas
        if (zoom > 0.12) {
          drawLandmarkIconOnCanvas(ctx, lm.iconKey, pinRadius, zoom);
        }

        // Show Text Label badge ONLY if zoomed in close (zoom >= 0.55), or selected/hovered
        if (zoom >= 0.55 || isSelected || isHovered) {
          ctx.font = `bold ${Math.round(12 / zoom)}px sans-serif`;
          const textMetrics = ctx.measureText(lm.nameRu);
          const textW = textMetrics.width;
          const textH = 18 / zoom;
          const labelY = (pinRadius + 14) / zoom;

          // Draw dark background pill
          ctx.fillStyle = isSelected ? 'rgba(245, 158, 11, 0.95)' : 'rgba(15, 23, 42, 0.92)';
          ctx.strokeStyle = isSelected ? '#ffffff' : lm.badgeColor;
          ctx.lineWidth = 1.5 / zoom;

          safeRoundRect(
            ctx,
            -textW / 2 - 6 / zoom,
            labelY - textH / 2,
            textW + 12 / zoom,
            textH,
            4 / zoom
          );
          ctx.fill();
          ctx.stroke();

          // Label text
          ctx.fillStyle = isSelected ? '#0f172a' : '#f8fafc';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(lm.nameRu, 0, labelY);
        }

        ctx.restore();
      }

      ctx.restore();

      animId = requestAnimationFrame(renderMap);
    };

    animId = requestAnimationFrame(renderMap);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen]);

  // --- MOUSE & POI INTERACTION HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
      return;
    }

    // Hover detection over POI landmarks
    const worldX = (e.clientX - panOffset.x) / zoom;
    const worldY = (e.clientY - panOffset.y) / zoom;
    let foundId: string | null = null;

    for (const lm of filteredLandmarks) {
      const dist = Math.hypot(lm.x - worldX, lm.y - worldY);
      const hitRadius = Math.max(30, 45 / zoom);
      if (dist < hitRadius) {
        foundId = lm.id;
        break;
      }
    }
    setHoveredLandmarkId(foundId);
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

  // --- TOUCH HANDLERS (Pinch & Double-tap) ---
  const handleTouchStart = (e: React.TouchEvent) => {
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
        
        const newZoom = Math.max(0.06, Math.min(3.0, initialZoomRef.current * factor));
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
    const endedTouches = Array.from(e.changedTouches) as React.Touch[];

    if (touchesRef.current.length === 1 && endedTouches.length > 0) {
      const touch = endedTouches[0];
      const dist = Math.hypot(touch.clientX - dragStartRef.current.x, touch.clientY - dragStartRef.current.y);
      
      if (dist < 10) {
        // Double tap detection
        const now = Date.now();
        const timeDiff = now - lastTapTimeRef.current;
        const posDiff = Math.hypot(touch.clientX - lastTapPosRef.current.x, touch.clientY - lastTapPosRef.current.y);

        if (timeDiff < 300 && posDiff < 35) {
          // Double-tap zoom in
          handleZoomAtPoint(1.6, touch.clientX, touch.clientY);
          lastTapTimeRef.current = 0;
        } else {
          lastTapTimeRef.current = now;
          lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };
          handleMapClick(touch.clientX, touch.clientY);
        }
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

  // Map Tap/Click Selection
  const handleMapClick = (screenX: number, screenY: number) => {
    const worldX = (screenX - panOffset.x) / zoom;
    const worldY = (screenY - panOffset.y) / zoom;

    let foundLandmark: CityLandmark | null = null;
    let bestDist = Infinity;

    for (const lm of filteredLandmarks) {
      const dist = Math.hypot(lm.x - worldX, lm.y - worldY);
      const hitRadius = Math.max(30, 60 / zoom);
      if (dist < hitRadius && dist < bestDist) {
        bestDist = dist;
        foundLandmark = lm;
      }
    }

    if (foundLandmark) {
      setSelectedLandmark(foundLandmark);
      centerOnLocation(foundLandmark.x, foundLandmark.y);
      onSetGpsTarget({ x: foundLandmark.x, y: foundLandmark.y, name: foundLandmark.nameRu });
      return;
    }

    // Tap on empty area -> Custom Waypoint
    setSelectedLandmark(null);
    onSetGpsTarget({
      x: Math.round(worldX),
      y: Math.round(worldY),
      name: 'Пользовательская метка'
    });
  };

  const handleTeleportToSelected = () => {
    if (!selectedLandmark) return;
    const matchedSpawn = SPAWN_LOCATIONS.find((s) => s.id === selectedLandmark.id) || {
      id: selectedLandmark.id,
      name: selectedLandmark.name,
      nameRu: selectedLandmark.nameRu,
      x: selectedLandmark.x,
      y: selectedLandmark.y,
      description: selectedLandmark.description,
      icon: null
    };
    onTeleport(matchedSpawn);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col font-sans select-none animate-in fade-in duration-150 touch-none overflow-hidden">
      {/* MAP CANVAS */}
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
        className={`w-full h-full block touch-none ${hoveredLandmarkId ? 'cursor-pointer' : (isDragging ? 'cursor-grabbing' : 'cursor-grab')}`}
      />

      {/* TOP BAR: SEARCH & GPS NAVIGATION HUD */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col gap-2.5 pointer-events-none">
        {/* Search input & Active Route bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {/* SEARCH INPUT */}
          <div className="relative pointer-events-auto flex-1 max-w-md">
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-2.5 text-zinc-100">
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
              <input
                type="text"
                placeholder="Поиск мест, АЗС, больниц, автосалонов..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                className="bg-transparent text-xs text-zinc-100 placeholder-zinc-500 outline-none w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* SEARCH RESULTS DROPDOWN */}
            {showSearchDropdown && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900/98 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-zinc-800/60 pointer-events-auto z-50">
                {filteredLandmarks.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-zinc-500 text-center">Ничего не найдено</div>
                ) : (
                  filteredLandmarks.slice(0, 8).map((lm) => (
                    <button
                      key={lm.id}
                      onClick={() => {
                        setSelectedLandmark(lm);
                        centerOnLocation(lm.x, lm.y);
                        setShowSearchDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-zinc-800/80 transition flex items-center justify-between gap-2 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 shadow text-white"
                          style={{ backgroundColor: lm.badgeColor }}
                        >
                          <LandmarkIcon iconKey={lm.iconKey} className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-200 group-hover:text-amber-400 truncate">
                            {lm.nameRu}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">{lm.description}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ACTIVE GPS NAVIGATION HEADER BAR & CLOSE BUTTON */}
          <div className="flex items-center gap-2 pointer-events-auto justify-between sm:justify-end">
            {world?.gpsDestination && (
              <div className="bg-zinc-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3 text-zinc-100 text-xs">
                <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 animate-pulse">
                  <Navigation className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-cyan-400 truncate max-w-[140px]">
                    {world.gpsDestination.name || 'Маршрут'}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
                    <span>{formatDistance(Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y))}</span>
                    <span>•</span>
                    <span>{formatEta(Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y))}</span>
                  </span>
                </div>
                <button
                  onClick={() => onSetGpsTarget(null)}
                  className="p-1.5 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition"
                  title="Сбросить маршрут"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              id="btn-close-map"
              onClick={onClose}
              className="bg-zinc-900/95 hover:bg-zinc-800 active:scale-95 border border-zinc-800 text-zinc-300 p-3 rounded-2xl shadow-2xl transition min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
              title="Закрыть карту"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CATEGORY FILTER PILL TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto pb-1">
          {[
            { id: 'all', label: 'Все места', iconKey: 'all' as LandmarkIconKey },
            { id: 'spawns', label: 'Спавны', iconKey: 'spawn' as LandmarkIconKey },
            { id: 'gas_stations', label: 'АЗС', iconKey: 'fuel' as LandmarkIconKey },
            { id: 'services', label: 'СТО & Салоны', iconKey: 'garage' as LandmarkIconKey },
            { id: 'shops', label: 'ТРЦ & Магазины', iconKey: 'mall' as LandmarkIconKey },
            { id: 'nature', label: 'Природа & Трассы', iconKey: 'nature' as LandmarkIconKey },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition shadow-lg ${
                activeCategory === tab.id
                  ? 'bg-amber-500 text-zinc-950 font-bold border border-amber-400'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
              }`}
            >
              <LandmarkIcon iconKey={tab.iconKey} className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT FLOATING CONTROL DOCK (ZOOM & RECENTER) */}
      <div className="absolute top-36 right-3 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => handleZoom(0.2)}
          className="bg-zinc-900/95 active:bg-zinc-800 border border-zinc-800 text-zinc-100 p-3 rounded-2xl shadow-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center hover:border-zinc-600"
          title="Приблизить (+)"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="bg-zinc-900/95 active:bg-zinc-800 border border-zinc-800 text-zinc-100 p-3 rounded-2xl shadow-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center hover:border-zinc-600"
          title="Отдалить (-)"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={centerOnPlayer}
          className="bg-zinc-900/95 active:bg-zinc-800 border border-zinc-800 text-amber-400 p-3 rounded-2xl shadow-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center hover:border-zinc-600"
          title="Центрировать на игроке"
        >
          <LocateFixed className="w-5 h-5" />
        </button>
        <button
          onClick={() => {
            setZoom(0.35);
            centerOnPlayer();
          }}
          className="bg-zinc-900/95 active:bg-zinc-800 border border-zinc-800 text-zinc-400 p-3 rounded-2xl shadow-xl transition min-w-[44px] min-h-[44px] flex items-center justify-center hover:border-zinc-600"
          title="Обзор всего города"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* BOTTOM POI ACTION SHEET (MOBILE MAP DETAILS CARD) */}
      {selectedLandmark && (
        <div className="absolute bottom-6 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-40 bg-zinc-900/95 backdrop-blur-md border border-amber-500/50 p-4 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-4 text-zinc-100 max-w-lg animate-in slide-in-from-bottom-4 duration-200 pointer-events-auto">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div
              className="w-11 h-11 rounded-2xl border flex items-center justify-center text-white shrink-0 shadow-lg"
              style={{ backgroundColor: `${selectedLandmark.badgeColor}33`, borderColor: selectedLandmark.badgeColor }}
            >
              <LandmarkIcon iconKey={selectedLandmark.iconKey} className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-zinc-100 truncate">{selectedLandmark.nameRu}</h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full shrink-0">
                  {formatDistance(Math.hypot(selectedLandmark.x - player.x, selectedLandmark.y - player.y))}
                </span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{selectedLandmark.description}</p>
            </div>
            <button
              onClick={() => setSelectedLandmark(null)}
              className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 sm:hidden"
            >
              <X className="w-4 h-4" />
            </button>
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
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl shadow flex items-center justify-center gap-1.5 text-xs min-h-[44px]"
            >
              <Navigation className="w-4 h-4" />
              <span>GPS Маршрут</span>
            </button>
            <button
              onClick={handleTeleportToSelected}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow flex items-center justify-center gap-1.5 text-xs min-h-[44px]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Телепорт</span>
            </button>
          </div>
        </div>
      )}

      {/* MAP LEGEND */}
      <div className="absolute bottom-4 left-3 z-30 pointer-events-auto">
        <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-2xl p-3 shadow-2xl text-xs text-zinc-300 max-w-[200px] sm:max-w-xs">
          <button
            onClick={() => setShowLegend((prev) => !prev)}
            className="font-bold text-zinc-200 flex items-center justify-between w-full gap-2 text-xs min-h-[32px]"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>Легенда карты</span>
            </span>
            <span className="text-[10px] text-zinc-400 font-mono">{showLegend ? 'Скрыть ▲' : 'Показать ▼'}</span>
          </button>

          {showLegend && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-zinc-800 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 border border-white" />
                <span>Вы (Игрок)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>AI-Трафик</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Светофоры</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 text-[8px] text-white flex items-center justify-center font-bold">P</span>
                <span>Парковки</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500 text-[8px] text-white flex items-center justify-center font-bold">G</span>
                <span>GPS Маршрут</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

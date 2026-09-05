import React, { useEffect, useRef, useState } from 'react';
import { 
  Building, 
  Camera, 
  GameWorld, 
  InputState, 
  InventoryItem,
  Pedestrian, 
  Player, 
  SidewalkBlock,
  StreetProp,
  TimeOfDay, 
  Tree,
  Vehicle,
  WeatherType,
  ActivePlacement
} from './types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, createDefaultVehicleDamage } from './cityMap';
import { loadMap } from './loadMap';
import { SpatialGrid } from './spatialGrid';
import { updateAITraffic, updatePedestrians, updateTrafficLights } from './aiTraffic';
import { 
  getAllBuildingEntrances,
  updateBreakablePropsAndLivingWorld,
  updatePlayerNeedsAndVitals,
  updatePlayerPedestrianPhysics, 
  updateSkidMarksAndParticles, 
  updateVehiclePhysics 
} from './physics';
import { GameRenderer } from './renderer';
import { getBuildingFloorsCount, generateBuildingLayout, constrainPlayerToInterior } from './buildingInteriors';
import { calculateGpsRoute } from './navigation';
import { sound } from './audio';
import { 
  addItemToPlayer,
  addPlayerNotification,
  cancelConsumption,
  createDefaultPlayerInventory, 
  createItem,
  deductPlayerCash,
  getPlayerCash,
  pickupGroundItem, 
  pickupNearbyLitter,
  isPlayerNearTrashBin,
  seedInitialGroundItems, 
  updateConsumption,
  useItemOnPlayer,
  ITEM_CATALOG,
  addPlayerCash
} from './items';
import { defaultBodyState } from './sensations';
import { TrafficConsole } from './components/TrafficConsole';
import { FullScreenMap } from './components/FullScreenMap';
import { LandscapeGuard } from './components/LandscapeGuard';
import { MobileTouchControls } from './components/MobileTouchControls';
import { MainMenu } from './components/MainMenu';
import { PlayerNeedsHUD } from './components/PlayerNeedsHUD';
import { InventoryModal } from './components/InventoryModal';
import { SelfInspectionModal } from './components/SelfInspectionModal';
import { LimbTreatmentModal } from './components/LimbTreatmentModal';
import { ShopModal, ShopItem, CITY_SHOPS, CityShop } from './components/ShopModal';
import { RadialMenu } from './components/RadialMenu';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { PerformanceProfiler } from './components/PerformanceProfiler';
import { performanceConfig } from './performanceConfig';
import { 
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudLightning,
  CloudRain,
  Compass, 
  Eye, 
  Gauge, 
  Heart,
  TreePine,
  Home,
  Building2,
  Truck,
  Map,
  Maximize2,
  Moon, 
  Navigation,
  RotateCcw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sun, 
  Sunrise, 
  Terminal,
  Thermometer,
  Volume2, 
  VolumeX, 
  Wrench,
  X,
  Zap,
  MapPin,
  Sparkles,
  Plane,
  ShieldAlert,
  Trash2,
  Coins,
  Wand2,
  RotateCw,
  Search
} from 'lucide-react';

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: React.ReactNode;
}

export const SPAWN_LOCATIONS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, аллеи со скамейками, грузовики и прогулочные зоны',
    icon: <TreePine className="w-8 h-8 text-emerald-400" />
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Центр Города (Парковка & Небоскребы)',
    x: 4350,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковочный комплекс',
    icon: <Building2 className="w-8 h-8 text-slate-400" />
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Дворовая парковка)',
    x: 2750,
    y: 2750,
    description: 'Уютный закрытый двор, подъезды, скамейки, урны, баки и припаркованные авто',
    icon: <Home className="w-8 h-8 text-amber-400" />
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Грузовая база & Склады)',
    x: 5200,
    y: 4400,
    description: 'Логистический хаб, стоянки спецтехники, грузовые терминалы и ангары',
    icon: <Truck className="w-8 h-8 text-stone-400" />
  },
  {
    id: 'pine_forest',
    name: 'Pine Ridge Outpost',
    nameRu: 'Лесной Заповедник (Грунтовые тропы)',
    x: 550,
    y: 550,
    description: 'Извилистые лесные тропы, сосновый бор, пруды и бездорожье для пикапа',
    icon: <Map className="w-8 h-8 text-emerald-600" />
  },
  {
    id: 'highway_junction',
    name: 'Silicon Highway Express',
    nameRu: 'Скоростное Шоссе (4-полосная магистраль)',
    x: 4000,
    y: 4000,
    description: 'Широкая магистраль с непрерывным плотным потоком AI-трафика и светофорами',
    icon: <Navigation className="w-8 h-8 text-sky-400" />
  }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Status
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isInVehicle, setIsInVehicle] = useState<boolean>(false);
  const [activeCarName, setActiveCarName] = useState<string>('');
  const [gear, setGear] = useState<'P' | 'D' | 'R' | 'N' | string>('D');
  const [isMobileTouch, setIsMobileTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
  });
  const [timeHour, setTimeHour] = useState<number>(10.0); // 0 to 24 hours
  const [isTimeAutoCycling, setIsTimeAutoCycling] = useState<boolean>(true);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [weatherTransition, setWeatherTransition] = useState<number>(1.0);
  const [damageDetails, setDamageDetails] = useState<{
    engineSmoking: boolean;
    engineFire: boolean;
    windshieldCracked: boolean;
    hoodBuckled: boolean;
    lightsBroken: boolean;
  }>({
    engineSmoking: false,
    engineFire: false,
    windshieldCracked: false,
    hoodBuckled: false,
    lightsBroken: false,
  });
  const [playerTurnSignal, setPlayerTurnSignal] = useState<'none' | 'left' | 'right' | 'hazard'>('none');
  const [canEnterBuilding, setCanEnterBuilding] = useState<Building | null>(null);
  const [canExitBuilding, setCanExitBuilding] = useState<boolean>(false);
  const [activeElevatorMenu, setActiveElevatorMenu] = useState<{
    bldId: string;
    bldName: string;
    currentFloor: number;
    maxFloors: number;
    type: 'elevator' | 'stairs';
  } | null>(null);
  const [fadeActive, setFadeActive] = useState<boolean>(false);
  const [playerHeadlightMode, setPlayerHeadlightMode] = useState<'off' | 'low' | 'high'>('low');
  const [fps, setFps] = useState<number>(60);
  const [streetName, setStreetName] = useState<string>('Grand Boulevard');
  const [nearbyCarPrompt, setNearbyCarPrompt] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [trafficCount, setTrafficCount] = useState<number>(0);
  const [pedCount, setPedCount] = useState<number>(0);
  const [minimapRange, setMinimapRange] = useState<number>(550);
  const minimapRangeRef = useRef<number>(550);
  minimapRangeRef.current = minimapRange;

  const [isMinimapExpanded, setIsMinimapExpanded] = useState<boolean>(false);
  const [isFullMapOpen, setIsFullMapOpen] = useState<boolean>(false);
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  const [gpsDestination, setGpsDestination] = useState<{ x: number; y: number; name?: string } | null>(null);

  const handleSetGpsTarget = (target: { x: number; y: number; name?: string } | null) => {
    setGpsDestination(target);
    if (worldRef.current) {
      if (!target) {
        worldRef.current.gpsDestination = null;
        worldRef.current.gpsPath = null;
      } else {
        worldRef.current.gpsDestination = target;
        worldRef.current.gpsPath = calculateGpsRoute(
          worldRef.current,
          { x: playerRef.current.x, y: playerRef.current.y },
          { x: target.x, y: target.y }
        );
      }
    }
  };
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState<boolean>(false);
  const [isRadialMenuOpen, setIsRadialMenuOpen] = useState<boolean>(false);
  const [treatmentModalItem, setTreatmentModalItem] = useState<{ index: number; item: InventoryItem } | null>(null);
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [shopTitle, setShopTitle] = useState<string>('СУПЕРМАРКЕТ 24/7');
  const [shopType, setShopType] = useState<CityShop['type']>('supermarket');
  const [nearShop, setNearShop] = useState<CityShop | null>(null);
  const nearShopRef = useRef<CityShop | null>(null);
  const [canRepairVehicle, setCanRepairVehicle] = useState<boolean>(false);
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number>(0);
  const selectedHotbarIndexRef = useRef<number>(0);
  selectedHotbarIndexRef.current = selectedHotbarIndex;
  const continuousUseTimerRef = useRef<number>(0);
  const [vitalsRefreshTick, setVitalsRefreshTick] = useState<number>(0);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [isPerfConsoleOpen, setIsPerfConsoleOpen] = useState<boolean>(false);
  const [currentPerfStats, setCurrentPerfStats] = useState({
    fps: 60,
    spatialGridTime: 0,
    aiTrafficTime: 0,
    pedestriansTime: 0,
    physicsTime: 0,
    viewportTime: 0,
    renderTime: 0,
    minimapTime: 0,
    totalFrameTime: 0,
    vehiclesTotal: 0,
    vehiclesVisible: 0,
    pedestriansTotal: 0,
    pedestriansVisible: 0,
    particlesTotal: 0
  });
  const perfHistoryRef = useRef<any[]>([]);
  const performanceStatsRef = useRef({
    fps: 60,
    spatialGridTime: 0,
    aiTrafficTime: 0,
    pedestriansTime: 0,
    physicsTime: 0,
    viewportTime: 0,
    renderTime: 0,
    minimapTime: 0,
    totalFrameTime: 0,
    vehiclesTotal: 0,
    vehiclesVisible: 0,
    pedestriansTotal: 0,
    pedestriansVisible: 0,
    particlesTotal: 0
  });
  const [isSpawnMenuOpen, setIsSpawnMenuOpen] = useState<boolean>(false);
  const [currentSpawnId, setCurrentSpawnId] = useState<string>('central_park');

  // Creative Mode States & Refs
  const [isCreativeMode, setIsCreativeMode] = useState<boolean>(false);
  const isCreativeModeRef = useRef<boolean>(false);
  isCreativeModeRef.current = isCreativeMode;

  const [isFlying, setIsFlying] = useState<boolean>(false);
  const isFlyingRef = useRef<boolean>(false);
  isFlyingRef.current = isFlying;

  const [isInvincible, setIsInvincible] = useState<boolean>(false);
  const isInvincibleRef = useRef<boolean>(false);
  isInvincibleRef.current = isInvincible;

  const [activePlacement, setActivePlacement] = useState<ActivePlacement | null>(null);
  const activePlacementRef = useRef<ActivePlacement | null>(null);
  activePlacementRef.current = activePlacement;

  // Creative Sidebar UI states
  const [creativeTab, setCreativeTab] = useState<'vehicles' | 'props' | 'items' | 'cheats'>('vehicles');
  const [creativeItemSearch, setCreativeItemSearch] = useState<string>('');
  const [creativeVehicleColor, setCreativeVehicleColor] = useState<string>('#38bdf8');

  // Engine Refs (persistent across renders)
  const timeHourRef = useRef<number>(10.0);
  timeHourRef.current = timeHour;

  const isTimeAutoCyclingRef = useRef<boolean>(true);
  isTimeAutoCyclingRef.current = isTimeAutoCycling;

  const weatherRef = useRef<WeatherType>('clear');
  weatherRef.current = weather;

  const weatherTransitionRef = useRef<number>(1.0);
  weatherTransitionRef.current = weatherTransition;

  const isMinimapExpandedRef = useRef<boolean>(false);
  isMinimapExpandedRef.current = isMinimapExpanded;

  const isMainMenuOpenRef = useRef<boolean>(true);
  isMainMenuOpenRef.current = isMainMenuOpen;

  // Time and Weather cycling functions
  const cycleTimePreset = () => {
    const current = timeHourRef.current;
    let next = 12.0;
    if (current < 8) next = 12.0;
    else if (current < 17) next = 18.5;
    else if (current < 21) next = 23.0;
    else next = 7.0;

    setTimeHour(next);
    timeHourRef.current = next;
    setIsTimeAutoCycling((prev) => !prev);
  };

  const cycleWeather = () => {
    const types: WeatherType[] = ['clear', 'rain', 'fog', 'storm'];
    const idx = types.indexOf(weather);
    const nextWeather = types[(idx + 1) % types.length];
    
    setWeather(nextWeather);
    weatherRef.current = nextWeather;
    setWeatherTransition(0.0);
    weatherTransitionRef.current = 0.0;

    sound.setRainAudio(nextWeather === 'rain' || nextWeather === 'storm');
  };

  const getTimeLabelName = (h: number) => {
    if (h >= 5 && h < 8) return 'Morning';
    if (h >= 8 && h < 17) return 'Day';
    if (h >= 17 && h < 20) return 'Sunset';
    return 'Night';
  };

  // --- REAL SAVE & LOAD ENGINE ---
  const [saves, setSaves] = useState<any[]>([]);
  const savesRef = useRef<any[]>([]);
  savesRef.current = saves;

  // Load saves list from storage on mount
  useEffect(() => {
    const rawSaves = localStorage.getItem('neon_city_saves');
    if (rawSaves) {
      try {
        const parsed = JSON.parse(rawSaves);
        setSaves(parsed);
      } catch (e) {
        console.error('Error parsing saves list', e);
      }
    }
  }, []);

  const syncSavesToStorage = (updatedSaves: any[]) => {
    setSaves(updatedSaves);
    localStorage.setItem('neon_city_saves', JSON.stringify(updatedSaves));
  };

  const handleCreateSave = (customName?: string) => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return;

    // Get current street name
    let currentStreet = 'Grand Boulevard';
    for (const road of world.roads) {
      const isHoriz = road.direction === 'horizontal';
      if (isHoriz && Math.abs(player.y - road.y1) < road.width / 2 + 20) {
        currentStreet = road.name;
        break;
      } else if (!isHoriz && Math.abs(player.x - road.x1) < road.width / 2 + 20) {
        currentStreet = road.name;
        break;
      }
    }

    const timeString = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const dateString = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    const saveName = customName || `Улица: ${currentStreet}`;

    const newSave = {
      id: Date.now().toString(),
      name: saveName,
      date: `${dateString} в ${timeString}`,
      playerX: player.x,
      playerY: player.y,
      playerAngle: player.angle,
      isInVehicle: player.isInVehicle,
      currentVehicleId: player.currentVehicleId,
      timeHour: timeHourRef.current,
      weather: weatherRef.current,
      streetName: currentStreet,
      gpsDestination: gpsDestination,
      needs: player.needs ? { ...player.needs } : undefined,
      inventory: player.inventory ? JSON.parse(JSON.stringify(player.inventory)) : undefined
    };

    let updated = [...savesRef.current];
    if (customName === 'Автосохранение') {
      updated = updated.filter(s => s.name !== 'Автосохранение');
    }
    updated.unshift(newSave);
    syncSavesToStorage(updated);
  };

  const handleLoadSave = (saveId: string) => {
    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) return;

    const save = savesRef.current.find(s => s.id === saveId);
    if (!save) return;

    // Prevent stuck input keys
    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.handbrake = false;
    inputRef.current.sprint = false;

    // Restore environmental state
    setTimeHour(save.timeHour);
    timeHourRef.current = save.timeHour;
    setWeather(save.weather);
    weatherRef.current = save.weather;
    handleSetGpsTarget(save.gpsDestination);

    // Restore player status & survival needs
    player.x = save.playerX;
    player.y = save.playerY;
    player.angle = save.playerAngle;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.isInVehicle = save.isInVehicle;
    player.currentVehicleId = save.currentVehicleId;

    if (save.needs && player.needs) {
      player.needs = { ...player.needs, ...save.needs };
    }
    if (save.inventory) {
      player.inventory = JSON.parse(JSON.stringify(save.inventory));
    }

    setIsInVehicle(save.isInVehicle);

    if (save.isInVehicle && save.currentVehicleId) {
      const veh = world.vehicles.find(v => v.id === save.currentVehicleId);
      if (veh) {
        veh.x = save.playerX;
        veh.y = save.playerY;
        veh.vx = 0;
        veh.vy = 0;
        veh.speed = 0;
        veh.isPlayerControlled = true;
        veh.isParked = false;
        const cfg = CAR_CONFIGS[veh.type];
        setActiveCarName(cfg?.name || 'Автомобиль');
        sound.startEngine();
      } else {
        // Find closest vehicle to player
        let closest: any = null;
        let minDist = 300;
        for (const v of world.vehicles) {
          const dist = Math.hypot(v.x - save.playerX, v.y - save.playerY);
          if (dist < minDist) {
            minDist = dist;
            closest = v;
          }
        }
        if (closest) {
          closest.x = save.playerX;
          closest.y = save.playerY;
          closest.vx = 0;
          closest.vy = 0;
          closest.speed = 0;
          closest.isPlayerControlled = true;
          closest.isParked = false;
          player.currentVehicleId = closest.id;
          const cfg = CAR_CONFIGS[closest.type];
          setActiveCarName(cfg?.name || 'Автомобиль');
          sound.startEngine();
        } else {
          player.isInVehicle = false;
          player.currentVehicleId = null;
          setIsInVehicle(false);
          setActiveCarName('');
        }
      }
    } else {
      setIsInVehicle(false);
      setActiveCarName('');
      sound.stopEngine();
    }

    // Teleport camera
    camera.x = save.playerX;
    camera.y = save.playerY;
    camera.targetX = save.playerX;
    camera.targetY = save.playerY;
    camera.targetZoom = 1.15;

    setIsMainMenuOpen(false);
  };

  const handleDeleteSave = (saveId: string) => {
    const updated = savesRef.current.filter(s => s.id !== saveId);
    syncSavesToStorage(updated);
  };

  const handleNewGame = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) return;

    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.handbrake = false;
    inputRef.current.sprint = false;

    const defaultSpawn = SPAWN_LOCATIONS[0]; // Central Park
    setCurrentSpawnId(defaultSpawn.id);
    setIsSpawnMenuOpen(false);

    if (player.currentVehicleId) {
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        veh.isPlayerControlled = false;
        veh.isParked = true;
        veh.turnSignal = 'none';
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;
      }
    }

    player.x = defaultSpawn.x;
    player.y = defaultSpawn.y;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.angle = 0;
    player.isInVehicle = false;
    player.currentVehicleId = null;
    player.needs = {
      health: 100,
      maxHealth: 100,
      hunger: 100,
      maxHunger: 100,
      thirst: 100,
      maxThirst: 100,
      energy: 100,
      maxEnergy: 100,
      sleepiness: 0,
      maxSleepiness: 100,
      isSleeping: false
    };
    player.inventory = createDefaultPlayerInventory();
    player.notifications = [];

    setIsInVehicle(false);
    setActiveCarName('');
    sound.stopEngine();

    setTimeHour(10.0);
    timeHourRef.current = 10.0;
    setWeather('clear');
    weatherRef.current = 'clear';
    handleSetGpsTarget(null);

    camera.x = defaultSpawn.x;
    camera.y = defaultSpawn.y;
    camera.targetX = defaultSpawn.x;
    camera.targetY = defaultSpawn.y;
    camera.targetZoom = 1.15;

    setIsMainMenuOpen(false);
  };

  const getMouseWorldPos = (sx: number, sy: number) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;

    // 1. Shift by screen center
    let dx = sx - canvas.width / 2;
    let dy = sy - canvas.height / 2;

    // 2. Inverse scale
    dx /= camera.zoom;
    dy /= camera.zoom;

    // 3. Inverse rotate
    const angle = camera.angle + Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    // 4. Inverse translate
    return {
      x: rx + camera.x,
      y: ry + camera.y
    };
  };

  const handleExecutePlacement = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    const placement = activePlacementRef.current;
    if (!world || !player || !placement) return;

    const mouseWorldPos = getMouseWorldPos(inputRef.current.mouseX || 0, inputRef.current.mouseY || 0);
    if (!mouseWorldPos) return;

    if (placement.type === 'vehicle') {
      const config = CAR_CONFIGS[placement.id];
      if (!config) return;
      const fs = createDefaultFuelSystem(placement.id as any, false);
      const newVehicle: Vehicle = {
        id: `spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: placement.id as any,
        x: mouseWorldPos.x,
        y: mouseWorldPos.y,
        vx: 0,
        vy: 0,
        angle: placement.angle,
        steerAngle: 0,
        targetSteerAngle: 0,
        speed: 0,
        lateralVelocity: 0,
        angularVelocity: 0,
        isDrifting: false,
        driftFactor: 0,
        mass: config.mass,
        width: config.width,
        length: config.length,
        wheelBase: config.wheelBase,
        color: placement.color || '#f43f5e',
        roofColor: placement.color || '#f43f5e',
        headlightsOn: false,
        headlightMode: 'off',
        brakeLightsOn: false,
        isReversing: false,
        turnSignal: 'none',
        turnSignalTimer: 0,
        requiredFuel: fs.fuelType === 'diesel' ? 'diesel' : (fs.octaneNumber === 92 ? 'ai92' : 'ai95'),
        engineState: createDefaultEngineState(placement.id as any, false, false),
        fuelSystem: fs,
        damage: createDefaultVehicleDamage(config.length, config.width),
        isPlayerControlled: false,
        isParked: false,
        targetSpeed: 0,
        currentLaneId: null,
        targetWaypointIndex: 0,
        routeWaypoints: [],
        aiState: 'parked',
        inIntersection: false,
        plannedTurn: 'straight',
        recentTurns: [],
        justTurnedAround: false,
        ghostingAlpha: 1.0,
        stuckTimer: 0,
        honkTimer: 0,
        isHonking: false,
        hornEffectTimer: 0
      };
      world.vehicles.push(newVehicle);
      spatialGridVehiclesRef.current.insert(newVehicle);
      sound.resume();
      addPlayerNotification(player, `Автомобиль ${placement.nameRu} создан!`, 'info');
    } else if (placement.type === 'prop') {
      const newProp: StreetProp = {
        id: `spawn_prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x: mouseWorldPos.x,
        y: mouseWorldPos.y,
        type: placement.id as any,
        angle: placement.angle,
        isBroken: false
      };
      world.props.push(newProp);
      spatialGridPropsRef.current.insert(newProp);
      addPlayerNotification(player, `Проп ${placement.nameRu} установлен!`, 'info');
    }
  };

  // Periodic autosave every 25 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (worldRef.current && playerRef.current && !isMainMenuOpenRef.current) {
        handleCreateSave('Автосохранение');
      }
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  const worldRef = useRef<GameWorld | null>(null);
  const playerRef = useRef<Player>({
    x: 4400,
    y: 2800,
    vx: 0,
    vy: 0,
    angle: 0,
    speed: 0,
    isInVehicle: false,
    currentVehicleId: null,
    walkCycle: 0,
    skinColor: '#ffd1b3',
    shirtColor: '#3b82f6',
    pantsColor: '#1e293b',
    hairColor: '#18181b',
    needs: {
      health: 100,
      hunger: 100,
      thirst: 100,
      energy: 100,
      sleepiness: 0,
      fullness: 60,
      nausea: 0
    },
    equippedClothing: {
      torso: { shirt: createItem('sweater_blue', 1) },
      legs: { shirt: createItem('jeans_blue', 1) },
      feet: { outerwear: createItem('work_boots', 1) },
      back: { outerwear: createItem('backpack', 1) }
    },
    inventory: createDefaultPlayerInventory(),
    maxInventorySlots: 18,
    notifications: []
  });

  const cameraRef = useRef<Camera>({
    x: 4400,
    y: 2800,
    angle: 0,
    targetAngle: 0,
    zoom: 1.15,
    targetZoom: 1.15,
    targetX: 4400,
    targetY: 2800,
    shakeTimer: 0,
    shakeIntensity: 0
  });

  const userZoomFactorRef = useRef<number>(1.0);

  const inputRef = useRef<InputState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    handbrake: false,
    sprint: false,
    actionE: false,
    hornH: false,
    headlightsL: false,
    timeToggleT: false,
    cameraZoomC: false,
    minimapZoomM: false,
    resetR: false,
    turnLeftQ: false,
    turnRightZ: false,
    shiftUp: false,
    shiftDown: false,
    hazardX: false,
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false
  });

  const rendererRef = useRef<GameRenderer | null>(null);
  const spatialGridBuildingsRef = useRef<SpatialGrid<Building>>(new SpatialGrid<Building>(250));
  const spatialGridVehiclesRef = useRef<SpatialGrid<Vehicle>>(new SpatialGrid<Vehicle>(200));
  const spatialGridPedestriansRef = useRef<SpatialGrid<Pedestrian>>(new SpatialGrid<Pedestrian>(150));
  const spatialGridTreesRef = useRef<SpatialGrid<Tree>>(new SpatialGrid<Tree>(250));
  const spatialGridPropsRef = useRef<SpatialGrid<StreetProp>>(new SpatialGrid<StreetProp>(200));
  const spatialGridSidewalksRef = useRef<SpatialGrid<SidewalkBlock>>(new SpatialGrid<SidewalkBlock>(300));

  // Turn signal audio tick timer
  const turnTickTimerRef = useRef<number>(0);
  const hudUpdateTimerRef = useRef<number>(0);
  const perfUiTimerRef = useRef<number>(0);

  // Initialize Game World (Runs ONCE on mount, NEVER resets when toggling day/night)
  useEffect(() => {
    let isMounted = true;
    let animationFrameId: number = 0;
    let cleanupListeners: (() => void) | null = null;

    sound.init();
    loadMap().then((world) => {
      if (!isMounted) return;
      worldRef.current = world;

      // Index static entities into spatial grids
      const bldGrid = spatialGridBuildingsRef.current;
      bldGrid.clear();
      world.buildings.forEach((b) => bldGrid.insert(b));

      const treeGrid = spatialGridTreesRef.current;
      treeGrid.clear();
      world.trees.forEach((t) => treeGrid.insert(t));

      const propGrid = spatialGridPropsRef.current;
      propGrid.clear();
      world.props.forEach((p) => propGrid.insert(p));

      const swGrid = spatialGridSidewalksRef.current;
      swGrid.clear();
      (world.sidewalks || []).forEach((sw) => swGrid.insert(sw));

      seedInitialGroundItems(world);

      setTrafficCount(world.vehicles.length);
      setPedCount(world.pedestrians.length);

      // Canvas setup
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      rendererRef.current = new GameRenderer(ctx);

      const handleResize = () => {
        if (!canvas || !rendererRef.current) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        rendererRef.current.resize(canvas.width, canvas.height);
      };

      window.addEventListener('resize', handleResize);
      handleResize();

    // --- KEYBOARD & MOUSE INPUT LISTENERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      sound.resume();
      const code = e.code;

      if (code === 'KeyR' && activePlacementRef.current) {
        setActivePlacement((prev) => {
          if (!prev) return null;
          return { ...prev, angle: (prev.angle + Math.PI / 12) % (Math.PI * 2) };
        });
        e.preventDefault();
        return;
      }

      if (code === 'Escape') {
        if (activePlacementRef.current) {
          setActivePlacement(null);
          activePlacementRef.current = null;
          e.preventDefault();
          return;
        }
        setIsInventoryOpen(false);
        setIsInspectionOpen(false);
        setIsConsoleOpen(false);
        setIsFullMapOpen(false);
        setIsSpawnMenuOpen(false);
        setIsQuickMenuOpen(false);
        const nextState = !isMainMenuOpenRef.current;
        setIsMainMenuOpen(nextState);
        if (nextState) {
          inputRef.current.forward = false;
          inputRef.current.backward = false;
          inputRef.current.left = false;
          inputRef.current.right = false;
          inputRef.current.handbrake = false;
          inputRef.current.sprint = false;
          // Trigger immediate autosave on pausing
          handleCreateSave('Автосохранение');
        }
        return; // Prevents any other keys from executing on Escape
      }

      if (isMainMenuOpenRef.current) return;

      // Inventory Modal Toggle (I or Tab)
      if (code === 'KeyI' || code === 'Tab') {
        setIsInventoryOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Hotbar item selection (1 - 6 and Numpad 1 - 6)
      if (code.startsWith('Digit') || code.startsWith('Numpad')) {
        const digitStr = code.replace('Digit', '').replace('Numpad', '');
        const digit = parseInt(digitStr, 10);
        if (digit >= 1 && digit <= 6) {
          const slotIdx = digit - 1;
          setSelectedHotbarIndex(slotIdx);
          selectedHotbarIndexRef.current = slotIdx;
          const p = playerRef.current;
          if (p) {
            p.selectedHotbarIndex = slotIdx;
          }
          sound.resume();
        }
      }

      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.shiftUp = true;
      if (code === 'ControlLeft' || code === 'ControlRight') inputRef.current.shiftDown = true;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = true;
      if (code === 'Space') {
        inputRef.current.handbrake = true;
        e.preventDefault();
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.sprint = true;
      if (code === 'KeyH') inputRef.current.hornH = true;

      // Turn Signals & Interaction / Consumption (Q = Left, E = Right in car or Use Selected Hotbar Item / Pickup on foot, Z = Hazard)
      if (code === 'KeyQ') {
        toggleTurnSignal('left');
      }
      if (code === 'KeyE') {
        handleInteractE();
      }
      if (code === 'KeyZ') {
        toggleTurnSignal('hazard');
      }

      // Engine Toggle (J key)
      if (code === 'KeyJ') {
        handleToggleEngine();
      }

      // Window Open / Close toggle (O key)
      if (code === 'KeyO') {
        handleToggleWindow();
      }

      // Interact/Enter/Exit Vehicle or Building (F key)
      if (code === 'KeyF') {
        handleInteract();
      }

      // AI Telemetry Console toggle
      if (code === 'F1') {
        setIsConsoleOpen((prev) => !prev);
        e.preventDefault();
      }

      // Performance Profiler Console toggle
      if (code === 'Backquote' || code === 'F2') {
        setIsPerfConsoleOpen((prev) => !prev);
        e.preventDefault();
      }

      // Time toggle (cycle presets)
      if (code === 'KeyT') {
        cycleTimePreset();
      }
      if (code === 'KeyC') {
        setIsInspectionOpen((prev) => !prev);
        e.preventDefault();
      }
      // Interactive Fullscreen Map toggle (M key)
      if (code === 'KeyM') {
        setIsFullMapOpen((prev) => !prev);
      }
      if (code === 'KeyR') {
        handleResetVehicle();
      }
      if (code === 'KeyL') {
        toggleHeadlights();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.shiftUp = false;
      if (code === 'ControlLeft' || code === 'ControlRight') inputRef.current.shiftDown = false;
      if (code === 'KeyW' || code === 'ArrowUp') inputRef.current.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') inputRef.current.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') inputRef.current.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') inputRef.current.right = false;
      if (code === 'Space') inputRef.current.handbrake = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') inputRef.current.sprint = false;
      if (code === 'KeyH') inputRef.current.hornH = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;

      // Update pedestrian aim angle if walking (accounting for camera rotation)
      const player = playerRef.current;
      if (!player.isInVehicle && canvas) {
        const screenCenterX = canvas.width / 2;
        const screenCenterY = canvas.height / 2;
        const screenDx = e.clientX - screenCenterX;
        const screenDy = e.clientY - screenCenterY;
        const camAngle = cameraRef.current.angle;
        player.aimAngle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (activePlacementRef.current) {
        const step = e.deltaY > 0 ? Math.PI / 12 : -Math.PI / 12;
        setActivePlacement((prev) => {
          if (!prev) return null;
          return { ...prev, angle: (prev.angle + step + Math.PI * 2) % (Math.PI * 2) };
        });
        e.preventDefault();
        return;
      }
      // Zoom in or out depending on deltaY direction
      const zoomStep = 0.08;
      if (e.deltaY < 0) {
        userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + zoomStep);
      } else {
        userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - zoomStep);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (activePlacementRef.current) {
        if (e.button === 0) {
          handleExecutePlacement();
          e.preventDefault();
        } else if (e.button === 2) {
          setActivePlacement(null);
          activePlacementRef.current = null;
          e.preventDefault();
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (activePlacementRef.current) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && canvas) {
        const touch = e.touches[0];
        const player = playerRef.current;
        if (!player.isInVehicle) {
          const screenCenterX = canvas.width / 2;
          const screenCenterY = canvas.height / 2;
          const screenDx = touch.clientX - screenCenterX;
          const screenDy = touch.clientY - screenCenterY;
          const camAngle = cameraRef.current.angle;
          player.aimAngle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    cleanupListeners = () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };

    // --- MAIN GAME ANIMATION LOOP ---
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const gameLoop = (now: number) => {
      const frameStart = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      // FPS calculation
      frameCount++;
      fpsTimer += dt;
      if (fpsTimer >= 0.5) {
        setFps(Math.round(frameCount / fpsTimer));
        frameCount = 0;
        fpsTimer = 0;
      }

      if (worldRef.current && rendererRef.current) {
        const world = worldRef.current;
        const player = playerRef.current;
        const camera = cameraRef.current;
        const input = inputRef.current;

        // 1. Update Dynamic Spatial Grids (done early so AI & physics use current frame positions)
        const tGridStart = performance.now();
        const vehGrid = spatialGridVehiclesRef.current;
        vehGrid.clear();
        world.vehicles.forEach((v) => vehGrid.insert(v));

        const pedGrid = spatialGridPedestriansRef.current;
        pedGrid.clear();
        world.pedestrians.forEach((p) => pedGrid.insert(p));

        const bldGrid = spatialGridBuildingsRef.current;
        const tGridEnd = performance.now();

        // 2 & 3. Update Traffic Lights & AI Traffic
        const tAiStart = performance.now();
        updateTrafficLights(world.intersections, dt);
        updateAITraffic(world, dt, vehGrid, pedGrid, { x: player.x, y: player.y });
        const tAiEnd = performance.now();

        // 4. Update Pedestrians (using spatial grids and player position)
        const tPedStart = performance.now();
        updatePedestrians(world, dt, vehGrid, pedGrid, bldGrid, { x: player.x, y: player.y }, spatialGridPropsRef.current);
        const tPedEnd = performance.now();

        // 5. Update Player & Vehicles Physics
        const tPhysStart = performance.now();
        const playerNearbyBuildings = bldGrid.queryRadius(
          player.x,
          player.y,
          300
        );

        if (!player.isInVehicle) {
          if (isFlyingRef.current) {
            // Noclip flying logic
            const flySpeed = input.sprint ? 1400 : 550; // Shift to fly super fast!
            let dx = 0;
            let dy = 0;

            const cosCam = Math.cos(camera.angle);
            const sinCam = Math.sin(camera.angle);

            if (input.forward) {
              dx += cosCam;
              dy += sinCam;
            }
            if (input.backward) {
              dx -= cosCam;
              dy -= sinCam;
            }
            if (input.left) {
              dx -= -sinCam;
              dy += cosCam;
            }
            if (input.right) {
              dx += -sinCam;
              dy -= cosCam;
            }

            const len = Math.hypot(dx, dy);
            if (len > 0) {
              player.x += (dx / len) * flySpeed * dt;
              player.y += (dy / len) * flySpeed * dt;
              player.angle = Math.atan2(dy, dx);
            }

            // Constraint boundaries
            player.x = Math.max(50, Math.min(world.width - 50, player.x));
            player.y = Math.max(50, Math.min(world.height - 50, player.y));

            camera.targetX = player.x;
            camera.targetY = player.y;
            camera.targetAngle = 0;
            camera.targetZoom = 1.3 * userZoomFactorRef.current;
          } else {
            updatePlayerPedestrianPhysics(player, input, playerNearbyBuildings, dt, camera.angle, world.width, world.height, world, vehGrid);
            if (!player.needsHospitalEvacuation) {
              camera.targetX = player.x;
              camera.targetY = player.y;
              camera.targetAngle = 0;
              camera.targetZoom = 1.3 * userZoomFactorRef.current;
            }
          }

          // Continuous Hold Item Usage (e.g. Fire Extinguisher, Zippo Lighter)
          if (input.isMouseDown || input.actionE) {
            const currentSlot = selectedHotbarIndexRef.current ?? 0;
            const item = player.inventory?.[currentSlot];
            if (item && item.usable && (item.itemId === 'extinguisher' || item.itemId === 'zippo_lighter' || item.itemId === 'fuel_canister')) {
              continuousUseTimerRef.current = (continuousUseTimerRef.current || 0) + dt;
              if (continuousUseTimerRef.current >= 0.08) {
                continuousUseTimerRef.current = 0;
                useItemOnPlayer(player, currentSlot, world);
                setVitalsRefreshTick(t => t + 1);
              }
            } else {
              continuousUseTimerRef.current = 0;
            }
          } else {
            continuousUseTimerRef.current = 0;
          }

          // Check building interior zones and constrain movement if player is inside
          if (player.isInsideBuilding && player.insideBuildingId) {
            const bld = world.buildings.find(b => b.id === player.insideBuildingId);
            if (bld) {
              const currentFloor = player.currentFloor ?? 0;
              const layout = generateBuildingLayout(bld, currentFloor);
              
              // Apply physical collisions with interior walls and furniture
              constrainPlayerToInterior(player, bld, layout, dt);
              if (!player.needsHospitalEvacuation) {
                camera.targetX = player.x;
                camera.targetY = player.y;
              }

              const relX = player.x - bld.x;
              const relY = player.y - bld.y;

              // Check if player is standing in ANY elevator zone
              const inElevator = (layout.elevators || [layout.elevatorZone]).some(el =>
                relX >= el.x && relX <= el.x + el.width &&
                relY >= el.y && relY <= el.y + el.height
              );

              // Check if player is standing in ANY stairs zone
              const inStairs = (layout.stairs || [layout.stairsZone]).some(st =>
                relX >= st.x && relX <= st.x + st.width &&
                relY >= st.y && relY <= st.y + st.height
              );

              // Check if player is standing in ANY exit zone or near doors on floor 0
              const exits = layout.exits || (layout.exitZone ? [layout.exitZone] : []);
              const inExit = exits.some(ex =>
                relX >= ex.x - 35 && relX <= ex.x + ex.width + 35 &&
                relY >= ex.y - 35 && relY <= ex.y + ex.height + 35
              ) || (currentFloor === 0 && (relY <= 50 || relY >= bld.height - 50 || relX <= 50 || relX >= bld.width - 50));

              const maxFloors = getBuildingFloorsCount(bld);
              const canGoUpOrDown = inElevator || inStairs;

              if (canGoUpOrDown) {
                setActiveElevatorMenu(prev => {
                  if (!prev || prev.bldId !== bld.id || prev.currentFloor !== currentFloor || prev.type !== (inElevator ? 'elevator' : 'stairs')) {
                    return {
                      bldId: bld.id,
                      bldName: bld.type.toUpperCase().replace('_', ' '),
                      currentFloor: currentFloor,
                      maxFloors: maxFloors,
                      type: inElevator ? 'elevator' : 'stairs'
                    };
                  }
                  return prev;
                });
              } else {
                setActiveElevatorMenu(null);
              }

              setCanExitBuilding(inExit);
              setCanEnterBuilding(null);

              // Check if player is inside a physical shop building or commercial room
              let currentRoomName = '';
              for (const room of layout.rooms) {
                if (relX >= room.x && relX <= room.x + room.width && relY >= room.y && relY <= room.y + room.height) {
                  currentRoomName = room.name;
                  break;
                }
              }

              let shopType: CityShop['type'] | null = null;
              let shopIcon = '[ТОРГ]';
              let badgeColor = '#f59e0b';
              let shopName = bld.nameRu || currentRoomName || 'Магазин';

              if (bld.shopBrand === 'pharmacy_36_6' || currentRoomName.includes('Аптека') || currentRoomName.includes('36.6') || currentRoomName.includes('Медпункт') || bld.type === 'hospital') {
                shopType = 'pharmacy';
                shopIcon = '[МЕД]';
                badgeColor = '#10b981';
                shopName = bld.nameRu || (currentRoomName.includes('Аптека') ? currentRoomName : 'Аптека "36.6"');
              } else if (bld.shopBrand === 'cofix_bakery' || currentRoomName.includes('Cofix') || currentRoomName.includes('Пекарня')) {
                shopType = 'cafe';
                shopIcon = '[КАФЕ]';
                badgeColor = '#ea580c';
                shopName = bld.nameRu || currentRoomName || 'Кафе & Пекарня "Cofix & Bakery"';
              } else if (bld.shopBrand === 'bean_bistro' || currentRoomName.includes('Bean & Bistro') || currentRoomName.includes('Кофейня') || currentRoomName.includes('Кафе')) {
                shopType = 'cafe';
                shopIcon = '[КАФЕ]';
                badgeColor = '#f59e0b';
                shopName = bld.nameRu || currentRoomName || 'Кафе & Кофейня "Bean & Bistro"';
              } else if (bld.shopBrand === 'dodo_pizza' || currentRoomName.includes('Пиццерия') || currentRoomName.includes('Додо') || currentRoomName.includes('Пицца')) {
                shopType = 'pizzeria';
                shopIcon = '[ПИЦЦА]';
                badgeColor = '#f97316';
                shopName = bld.nameRu || currentRoomName || 'Пиццерия "Додо Пицца"';
              } else if (bld.shopBrand === 'vkusno_tochka' || currentRoomName.includes('Вкусно — и точка') || currentRoomName.includes('Бургерная') || currentRoomName.includes('Вкусно и Точка') || currentRoomName.includes('Фастфуд')) {
                shopType = 'fast_food';
                shopIcon = '[ЕДА]';
                badgeColor = '#ef4444';
                shopName = bld.nameRu || currentRoomName || 'Ресторан "Вкусно — и точка"';
              } else if (bld.shopBrand === 'mvideo' || currentRoomName.includes('М.Видео') || currentRoomName.includes('Электроника') || currentRoomName.includes('Гаджет')) {
                shopType = 'electronics';
                shopIcon = '[ТЕХ]';
                badgeColor = '#3b82f6';
                shopName = bld.nameRu || currentRoomName || 'Гипермаркет электроники "М.Видео"';
              } else if (bld.shopBrand === 'sportmaster' || currentRoomName.includes('Спортмастер') || currentRoomName.includes('Спорт')) {
                shopType = 'sports_shop';
                shopIcon = '[СПОРТ]';
                badgeColor = '#0ea5e9';
                shopName = bld.nameRu || currentRoomName || 'Спортивный гипермаркет "Спортмастер"';
              } else if (bld.shopBrand === 'pitstop_service' || bld.type === 'car_dealership' || currentRoomName.includes('PIT-STOP') || currentRoomName.includes('Авто')) {
                shopType = 'auto_shop';
                shopIcon = '[АВТО]';
                badgeColor = '#0284c7';
                shopName = bld.nameRu || 'Автомастерская & Сервис "PIT-STOP"';
              } else if (bld.shopBrand === 'splav_gear' || currentRoomName.includes('Сплав') || currentRoomName.includes('Туризм') || currentRoomName.includes('Охота') || currentRoomName.includes('Снаряжение')) {
                shopType = 'gear_shop';
                shopIcon = '[ТУРИЗМ]';
                badgeColor = '#84cc16';
                shopName = bld.nameRu || 'Магазин "Охота & Туризм Сплав"';
              } else if (bld.shopBrand === 'perekrestok' || currentRoomName.includes('Перекрёсток')) {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#16a34a';
                shopName = bld.nameRu || 'Супермаркет "Перекрёсток 24/7"';
              } else if (bld.shopBrand === 'pyaterochka' || currentRoomName.includes('Пятёрочка')) {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#dc2626';
                shopName = bld.nameRu || 'Супермаркет "Пятёрочка 24/7"';
              } else if (currentRoomName.includes('Суши') || currentRoomName.includes('WOK') || currentRoomName.includes('Якитория')) {
                shopType = 'sushi_asian';
                shopIcon = '[СУШИ]';
                badgeColor = '#ec4899';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Кинобар') || currentRoomName.includes('Синема') || currentRoomName.includes('Попкорн')) {
                shopType = 'cinema_bar';
                shopIcon = '[КИНО]';
                badgeColor = '#a855f7';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Одежда') || currentRoomName.includes('Zara') || currentRoomName.includes('Бутик')) {
                shopType = 'clothing';
                shopIcon = '[ОДЕЖДА]';
                badgeColor = '#6366f1';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Книжн') || currentRoomName.includes('Читай-Город')) {
                shopType = 'bookstore';
                shopIcon = '[КНИГИ]';
                badgeColor = '#14b8a6';
                shopName = currentRoomName;
              } else if (bld.type === 'police_station') {
                shopType = 'gear_shop';
                shopIcon = '[ЩИТ]';
                badgeColor = '#1d4ed8';
                shopName = 'Арсенал & Снаряжение полиции';
              } else if (bld.type === 'shopping_mall' || bld.type === 'commercial' || bld.type === 'shop') {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#f59e0b';
                shopName = bld.nameRu || currentRoomName || 'Торговый отдел';
              }

              let shopFound: CityShop | null = null;
              if (shopType) {
                shopFound = {
                  id: `room_shop_${bld.id}_${currentFloor}_${Math.floor(relX)}_${Math.floor(relY)}`,
                  nameRu: shopName,
                  type: shopType,
                  x: bld.x + relX,
                  y: bld.y + relY,
                  icon: shopIcon,
                  badgeColor: badgeColor,
                  description: `Отдел: ${shopName}. Нажмите [E] для открытия каталога.`
                };
              }

              nearShopRef.current = shopFound;
              setNearShop(shopFound);
              setCanRepairVehicle(shopFound?.type === 'auto_shop');
            } else {
              setActiveElevatorMenu(null);
              setCanExitBuilding(false);
              setCanEnterBuilding(null);
              nearShopRef.current = null;
              setNearShop(null);
              setCanRepairVehicle(false);
            }
          } else {
            setActiveElevatorMenu(null);
            setCanExitBuilding(false);

            // Check if player is near any building entrance outside (checking all entrances)
            let nearEntrance = false;
            let bldNear: Building | null = null;
            for (const bld of playerNearbyBuildings) {
              if (bld.type === 'park_monument') continue;
              const ents = getAllBuildingEntrances(bld);
              for (const ent of ents) {
                const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
                if (dist < 35) {
                  nearEntrance = true;
                  bldNear = bld;
                  break;
                }
              }
              if (nearEntrance) break;
            }

            if (nearEntrance && bldNear) {
              setCanEnterBuilding(bldNear);
            } else {
              setCanEnterBuilding(null);
            }

            // Outside on roads/streets: no shop interaction prompt
            nearShopRef.current = null;
            setNearShop(null);
            setCanRepairVehicle(player.isInVehicle);
          }
        } else {
          setActiveElevatorMenu(null);
          setCanExitBuilding(false);
          setCanEnterBuilding(null);
        }

        // Update all vehicles (both AI and player car)
        let playerCar: Vehicle | null = null;
        for (const veh of world.vehicles) {
          const vehNearbyBuildings = bldGrid.queryRadius(
            veh.x,
            veh.y,
            250
          );
          const vehNearbyCars = vehGrid.queryRadius(
            veh.x,
            veh.y,
            180
          );

          if (veh.isPlayerControlled) {
            playerCar = veh;
            // Play ticking sound for player turn signals
            if (veh.turnSignal !== 'none') {
              turnTickTimerRef.current += dt;
              if (turnTickTimerRef.current >= 0.35) {
                turnTickTimerRef.current = 0;
                sound.playTurnSignalTick(Math.floor(veh.turnSignalTimer * 3) % 2 === 0);
              }
            }
          }

          updateVehiclePhysics(
            veh,
            veh.isPlayerControlled ? input : null,
            world,
            vehNearbyBuildings,
            vehNearbyCars,
            dt,
            player
          );

          if (veh.isPlayerControlled) {
            player.x = veh.x;
            player.y = veh.y;
            camera.targetX = veh.x + Math.cos(veh.angle) * (veh.speed * 0.25);
            camera.targetY = veh.y + Math.sin(veh.angle) * (veh.speed * 0.25);
            camera.targetAngle = veh.angle;

            // Dynamic camera zoom: speed zoom out
            const speedRatio = Math.min(1.0, Math.abs(veh.speed) / 500);
            camera.targetZoom = (1.05 - speedRatio * 0.35) * userZoomFactorRef.current;
          }
        }

        // Survival & Needs Simulation (Hunger, Thirst, Fatigue, Sleepiness, Health)
        updatePlayerNeedsAndVitals(player, world, dt, input, timeHourRef.current);

        if (isInvincibleRef.current || isCreativeModeRef.current) {
          player.needs.health = 100;
          player.needs.hunger = 100;
          player.needs.thirst = 100;
          player.needs.energy = 100;
          player.needs.sleepiness = 0;
          if (player.bodyState) {
            player.bodyState.painLevel = 0;
            player.bodyState.bloodLoss = 0;
            player.bodyState.shockLevel = 0;
            Object.keys(player.bodyState.bodyParts).forEach((k) => {
              const part = (player.bodyState!.bodyParts as any)[k] as any[];
              if (Array.isArray(part)) {
                part.forEach(inj => {
                  inj.treated = true;
                  inj.severity = 0;
                });
              }
            });
          }
        }

        // Consumption timer (multi-step eating/drinking)
        updateConsumption(player, dt);

        // 6. Throttled HUD State Updates (Run at ~12.5 Hz to prevent React re-render lag)
        hudUpdateTimerRef.current += dt;
        if (hudUpdateTimerRef.current >= 0.08) {
          hudUpdateTimerRef.current = 0;
          setVitalsRefreshTick((t) => t + 1);

          if (playerCar) {
            const currentSpeedKmh = Math.round(Math.abs(playerCar.speed) * 0.36);
            setSpeedKmh(currentSpeedKmh);
            setIsDrifting(playerCar.isDrifting);
            setPlayerTurnSignal(playerCar.turnSignal);
            if (playerCar.damage) {
              setDamageDetails({
                engineSmoking: !!playerCar.damage.engineSmoking,
                engineFire: !!(playerCar.damage.engineFire || playerCar.damage.fuelTankFire || playerCar.damage.cabinFire),
                windshieldCracked: !!playerCar.damage.windshieldCracked,
                hoodBuckled: !!playerCar.damage.hoodBuckled,
                lightsBroken: !!(
                  playerCar.damage.leftHeadlightBroken || 
                  playerCar.damage.rightHeadlightBroken || 
                  playerCar.damage.leftTaillightBroken || 
                  playerCar.damage.rightTaillightBroken
                )
              });
            }

            if (playerCar.engineState) {
              const eng = playerCar.engineState;
              if (eng.transmissionType === 'AUTO') {
                setGear(eng.autoGearMode || 'D');
              } else {
                setGear(eng.currentGear === -1 ? 'R' : eng.currentGear === 0 ? 'N' : String(eng.currentGear));
              }
            } else {
              setGear('D');
            }
          }

          // Determine current street name
          let currentStreet = 'Grand Boulevard';
          for (const road of world.roads) {
            const isHoriz = road.direction === 'horizontal';
            if (isHoriz && Math.abs(player.y - road.y1) < road.width / 2 + 20) {
              currentStreet = road.name;
              break;
            } else if (!isHoriz && Math.abs(player.x - road.x1) < road.width / 2 + 20) {
              currentStreet = road.name;
              break;
            }
          }
          setStreetName(currentStreet);

          // Check for nearby car if walking on foot
          if (!player.isInVehicle) {
            let foundNearbyCar: Vehicle | null = null;
            const nearbyVehicles = vehGrid.queryRadius(player.x, player.y, 80);
            for (const veh of nearbyVehicles) {
              const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
              if (dist < 75) {
                foundNearbyCar = veh;
                break;
              }
            }
            if (foundNearbyCar) {
              setNearbyCarPrompt('[F] Войти в автомобиль');
            } else {
              setNearbyCarPrompt(null);
            }
          } else {
            setNearbyCarPrompt(null);
          }

          // GPS Navigation Route recalculation & Arrival check
          if (world.gpsDestination) {
            const distToDest = Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y);
            if (distToDest < 60) {
              world.gpsDestination = null;
              world.gpsPath = null;
              setGpsDestination(null);
              sound.playHorn('sedan');
            } else if (!world.gpsPath || Math.random() < 0.05) {
              world.gpsPath = calculateGpsRoute(
                world,
                { x: player.x, y: player.y },
                { x: world.gpsDestination.x, y: world.gpsDestination.y }
              );
            }
          } else {
            world.gpsPath = null;
          }

          setTrafficCount(world.vehicles.length);
          setPedCount(world.pedestrians.length);

          if (isTimeAutoCyclingRef.current) {
            setTimeHour(timeHourRef.current);
          }
          if (weatherTransitionRef.current < 1.0) {
            setWeatherTransition(weatherTransitionRef.current);
          }
        }

        // 7. Update Skid marks, Particles & Breakables / Living World
        world.weather = weatherRef.current;
        updateSkidMarksAndParticles(world, player, dt);
        updateBreakablePropsAndLivingWorld(world, player, dt, vehGrid);

        // 8. Ambulance Evacuation & Specialized Hospital Treatment System (runs before camera lerp)
        if (player.needsHospitalEvacuation) {
          player.isFainting = true;
          player.hospitalEvacTimer = (player.hospitalEvacTimer || 0) + dt;

          // Force unmount from vehicle if trapped inside
          if (player.isInVehicle) {
            player.isInVehicle = false;
            player.currentVehicleId = null;
            setIsInVehicle(false);
          }

          if (!player.evacStartPos) {
            player.evacStartPos = { x: player.x, y: player.y };
          }

          // Dynamically locate City Hospital #1 in world map
          const hospitalBld = world.buildings.find(b => b.type === 'hospital');
          const hospX = hospitalBld ? hospitalBld.x + hospitalBld.width / 2 : 3525;
          const hospY = hospitalBld ? hospitalBld.y + hospitalBld.height + 40 : 1014;

          // Initialize ambulance dispatch
          if (!player.evacPhase || player.evacPhase === 'dispatch') {
            player.evacPhase = 'ambulance_to_player';
            player.hospitalEvacTimer = 0;

            let amb = world.vehicles.find(v => v.id === 'evac_ambulance_special');
            const startAngle = Math.atan2(player.evacStartPos.y - hospY, player.evacStartPos.x - hospX);
            if (!amb) {
              amb = {
                id: 'evac_ambulance_special',
                type: 'ambulance_van',
                x: hospX,
                y: hospY,
                vx: 0,
                vy: 0,
                angle: startAngle,
                speed: 250,
                maxSpeed: 600,
                acceleration: 400,
                braking: 400,
                color: '#f8fafc',
                isParked: false,
                isPlayerControlled: false,
                headlightsOn: true,
                sirenOn: true,
                sirenStrobe: 0,
                engineState: createDefaultEngineState('ambulance_van', true, false),
                fuelSystem: createDefaultFuelSystem('ambulance_van', false),
                damage: createDefaultVehicleDamage()
              };
              world.vehicles.push(amb);
            } else {
              amb.x = hospX;
              amb.y = hospY;
              amb.angle = startAngle;
              amb.sirenOn = true;
              amb.headlightsOn = true;
              amb.isParked = false;
            }
            player.evacAmbulanceId = amb.id;

            // Immediately orient camera at hospital dispatch
            camera.x = hospX;
            camera.y = hospY;
            camera.targetX = hospX;
            camera.targetY = hospY;
            camera.targetZoom = 1.35;

            // Clear AI traffic along ambulance route
            world.vehicles = world.vehicles.filter(v => v.id === amb!.id || v.isParked || Math.hypot(v.x - hospX, v.y - hospY) > 600);
            sound.startSiren();
          }

          // --- PHASE: AMBULANCE DRIVES TO PLAYER WITH CAMERA TRACKING ---
          if (player.evacPhase === 'ambulance_to_player') {
            sound.updateSiren(dt);
            const amb = world.vehicles.find(v => v.id === player.evacAmbulanceId);
            if (amb) {
              const dx = player.evacStartPos.x - amb.x;
              const dy = player.evacStartPos.y - amb.y;
              const dist = Math.hypot(dx, dy);

              if (dist > 60) {
                const targetAngle = Math.atan2(dy, dx);
                let aDiff = (targetAngle - amb.angle) % (Math.PI * 2);
                if (aDiff < -Math.PI) aDiff += Math.PI * 2;
                if (aDiff > Math.PI) aDiff -= Math.PI * 2;
                amb.angle += aDiff * Math.min(1.0, 7 * dt);

                const moveSpeed = Math.max(250, Math.min(650, dist * 0.9));
                amb.speed = moveSpeed;
                amb.vx = Math.cos(amb.angle) * moveSpeed;
                amb.vy = Math.sin(amb.angle) * moveSpeed;
                amb.x += amb.vx * dt;
                amb.y += amb.vy * dt;
                amb.sirenStrobe = (amb.sirenStrobe || 0) + dt * 20;
                amb.sirenOn = true;
                amb.headlightsOn = true;
              }

              // Camera tracks ambulance vehicle
              camera.targetX = amb.x;
              camera.targetY = amb.y;
              camera.targetZoom = 1.35;

              // Keep path clear of other AI traffic
              world.vehicles = world.vehicles.filter(v => v.id === amb.id || v.isParked || Math.hypot(v.x - amb.x, v.y - amb.y) > 400);

              if (dist <= 75 || player.hospitalEvacTimer >= 9.0) {
                player.evacPhase = 'return_dark';
                player.hospitalEvacTimer = 0;
              }
            } else {
              player.evacPhase = 'return_dark';
              player.hospitalEvacTimer = 0;
            }
          }

          // --- PHASE: RETURN TO HOSPITAL IN PITCH BLACKNESS ---
          else if (player.evacPhase === 'return_dark') {
            sound.updateSiren(dt);
            if (player.hospitalEvacTimer >= 3.5) {
              // Complete transport -> Wake up at Hospital Bed
              player.x = hospX;
              player.y = hospY;
              player.vx = 0;
              player.vy = 0;
              player.isInVehicle = false;
              player.currentVehicleId = null;

              // Tailored medical diagnosis & prescription based on cause
              const cause = player.evacCause || 'general';
              let diagnosis = {
                causeName: 'Острое истощение и полиорганная недостаточность',
                description: 'Пациент доставлен реанимационной бригадой скорой помощи. Проведена комплексная интенсивная терапия.',
                treatmentsApplied: ['Инфузионная оксигенотерапия и кардиомониторинг', 'Восстановление электролитного баланса'],
                prescriptionsGiven: ['Обезболивающее (3 шт)', 'Стерильный бинт (1 шт)'],
                billAmount: Math.max(1200, Math.floor((player.cash || 0) * 0.25))
              };

              if (cause === 'fire_burns') {
                diagnosis = {
                  causeName: 'Тяжелые термические ожоги кожи II-III степени, тепловой шок',
                  description: 'Пациент извлечен из огня. Проведена хирургическая обработка ожогов и противошоковая инфузия.',
                  treatmentsApplied: ['Обработка ожогов противоожоговым гелем с серебром', 'Инфузионная терапия физраствором (2000 мл)', 'Оксигенобаротерапия легких'],
                  prescriptionsGiven: ['Спрей Пантенол от ожогов x1', 'Бальзам «Спасатель» x1', 'Сильное обезболивающее x2'],
                  billAmount: Math.max(2200, Math.floor((player.cash || 0) * 0.35))
                };
              } else if (cause === 'fractures_shock') {
                diagnosis = {
                  causeName: 'Травматический болевой шок, тяжелые переломы конечностей',
                  description: 'Выполнена репозиция костных отломков, иммобилизация конечностей гипсом и шинами.',
                  treatmentsApplied: ['Нейролептаналгезия и местная анестезия', 'Наложение иммобилизационных шин и гипса', 'Остеосинтез и рентгеноскопия'],
                  prescriptionsGiven: ['Медицинская шина x2', 'Обезболивающее (морфин/кеторол) x3', 'Антисептик x1'],
                  billAmount: Math.max(1800, Math.floor((player.cash || 0) * 0.30))
                };
              } else if (cause === 'blood_loss') {
                diagnosis = {
                  causeName: 'Острая массивная кровопотеря, геморрагический шок',
                  description: 'Остановлено массивное кровотечение, выполнена перевязка сосудов и гемотрансфузия плазмы.',
                  treatmentsApplied: ['Переливание свежезамороженной плазмы (1500 мл)', 'Сосудистый шов и коагуляция', 'Гепаринотерапия'],
                  prescriptionsGiven: ['Жгут кровоостанавливающий x2', 'Перевязочный пакет x2', 'Физраствор x1'],
                  billAmount: Math.max(2000, Math.floor((player.cash || 0) * 0.32))
                };
              } else if (cause === 'hypothermia') {
                diagnosis = {
                  causeName: 'Глубокая гипотермия и холодовая кома (температура < 32°C)',
                  description: 'Проведено интенсивное согревание в специальной барокамере, инфузия теплых растворов.',
                  treatmentsApplied: ['Активное согревание в термопалате', 'Инфузия теплых глюкозо-солевых растворов', 'Термоизоляционное одеяло'],
                  prescriptionsGiven: ['Согревающая термогрелка x2', 'Витаминный сбор x2'],
                  billAmount: Math.max(1400, Math.floor((player.cash || 0) * 0.25))
                };
              } else if (cause === 'starvation') {
                diagnosis = {
                  causeName: 'Острое алиментарное истощение и гипогликемия',
                  description: 'Критическое истощение питательных веществ. Проведено парентеральное питание и капельницы глюкозы.',
                  treatmentsApplied: ['Внутривенная инфузия Глюкозы 40%', 'Восстановление электролитного состава', 'Витаминизация'],
                  prescriptionsGiven: ['Питательный гель x2', 'Минеральная вода x2', 'Энергетический батончик x2'],
                  billAmount: Math.max(1100, Math.floor((player.cash || 0) * 0.20))
                };
              }

              player.evacDiagnosis = diagnosis;

              // Initial critical ICU baseline vitals (recovering through therapy)
              player.needs.health = 25;
              player.needs.hunger = 45;
              player.needs.thirst = 45;
              player.needs.energy = 35;
              player.needs.sleepiness = 0;

              if (player.bodyState) {
                player.bodyState.painLevel = 50;
                player.bodyState.bloodLoss = 15;
                player.bodyState.shockLevel = 20;
                player.bodyState.temperature = 36.6;
                player.bodyState.wetness = 0;
              }

              sound.stopSiren();

              // Clean up ambulance
              world.vehicles = world.vehicles.filter(v => v.id !== player.evacAmbulanceId);
              player.evacAmbulanceId = null;

              // Clear evacuation state completely
              player.needsHospitalEvacuation = false;
              player.evacPhase = undefined;
              player.hospitalEvacTimer = 0;
              player.isFainting = false;
              player.isHospitalized = true;
              player.hospitalTimer = 0;
              player.hospitalTreatmentProgress = 5;

              camera.targetX = hospX;
              camera.targetY = hospY;
              camera.x = hospX;
              camera.y = hospY;

              addPlayerNotification(player, `🚑 Вы доставлены в палату интенсивной терапии Городской Больницы №1!`, 'heal');
            }
          }
        }

        // 8.5. Smooth Camera Lerp
        camera.x += (camera.targetX - camera.x) * 6 * dt;
        camera.y += (camera.targetY - camera.y) * 6 * dt;
        camera.zoom += (camera.targetZoom - camera.zoom) * 4 * dt;

        // Active Interactive Hospital Treatment Simulation
        if (player.isHospitalized) {
          player.hospitalTimer = (player.hospitalTimer || 0) + dt;
          
          // Periodic subtle ECG beep
          if (Math.floor(player.hospitalTimer * 1.1) !== Math.floor((player.hospitalTimer - dt) * 1.1)) {
            sound.playHeartMonitorBeep();
          }

          // Advance treatment progress (~7-8 seconds full therapy)
          const curProg = player.hospitalTreatmentProgress || 5;
          const newProg = Math.min(100, curProg + dt * 14.5);
          player.hospitalTreatmentProgress = newProg;

          // Gradual healing of player vitals matching treatment progress
          const targetHealth = 25 + (newProg / 100) * 75;
          if (player.needs.health < targetHealth) {
            player.needs.health = Math.min(100, player.needs.health + dt * 15);
          }
          if (player.needs.energy < 80) player.needs.energy = Math.min(80, player.needs.energy + dt * 12);
          if (player.needs.hunger < 70) player.needs.hunger = Math.min(70, player.needs.hunger + dt * 10);
          if (player.needs.thirst < 70) player.needs.thirst = Math.min(70, player.needs.thirst + dt * 10);

          if (player.bodyState) {
            player.bodyState.painLevel = Math.max(0, 50 * (1 - newProg / 100));
            player.bodyState.bloodLoss = Math.max(0, 15 * (1 - newProg / 100));
            player.bodyState.shockLevel = Math.max(0, 20 * (1 - newProg / 100));
            player.bodyState.temperature = 36.6;
            player.bodyState.wetness = 0;

            if (newProg >= 75) {
              Object.keys(player.bodyState.bodyParts).forEach((k) => {
                const part = (player.bodyState!.bodyParts as any)[k] as any[];
                if (Array.isArray(part)) {
                  part.forEach(inj => {
                    inj.treated = true;
                    inj.severity = 0;
                  });
                }
              });
            }
          }
        }

        // Smooth camera rotation lerp with slight lag/delay
        let angleDiff = (camera.targetAngle - camera.angle) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        const rotSpeed = player.isInVehicle ? 3.0 : 1.5;
        camera.angle += angleDiff * Math.min(1.0, rotSpeed * dt);
        const tPhysEnd = performance.now();

        // 9. Query objects in Camera Viewport for high-performance rendering
        const tVpStart = performance.now();
        const vpMargin = Math.hypot(window.innerWidth, window.innerHeight) / (2 * Math.max(0.4, camera.zoom)) + 150;
        const vpBuildings = bldGrid.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpVehicles = vehGrid.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpPedestrians = pedGrid.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpTrees = spatialGridTreesRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpProps = spatialGridPropsRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpSidewalks = spatialGridSidewalksRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const tVpEnd = performance.now();

        // Advance simulation time
        if (isTimeAutoCyclingRef.current) {
          timeHourRef.current = (timeHourRef.current + dt * 0.12) % 24;
        }

        if (weatherTransitionRef.current < 1.0) {
          weatherTransitionRef.current = Math.min(1.0, weatherTransitionRef.current + dt * 0.5);
        }

        // Calculate mouse world position for placement preview
        let currentMouseWorldPos = null;
        if (activePlacementRef.current) {
          currentMouseWorldPos = getMouseWorldPos(input.mouseX || 0, input.mouseY || 0);
        }

        // 10. Render Scene with pre-culled viewport entities
        const tRenderStart = performance.now();
        rendererRef.current.render(
          world,
          player,
          camera,
          timeHourRef.current,
          weatherTransitionRef.current,
          vpBuildings,
          vpVehicles,
          vpPedestrians,
          vpTrees,
          vpProps,
          vpSidewalks,
          activePlacementRef.current,
          currentMouseWorldPos
        );
        const tRenderEnd = performance.now();

        // 11. Render Minimap
        const tMinimapStart = performance.now();
        if (performanceConfig.enableMinimap) {
          renderMinimap(world, player, camera, isMinimapExpandedRef.current);
        } else {
          // Clear minimap canvas to prevent visual residues
          const mCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
          if (mCanvas) {
            const mCtx = mCanvas.getContext('2d');
            mCtx?.clearRect(0, 0, mCanvas.width, mCanvas.height);
          }
        }
        const tMinimapEnd = performance.now();

        // Calculate final performance stats
        const totalFrameMs = performance.now() - frameStart;
        const computedFps = Math.round(frameCount / (fpsTimer || 0.01)) || 60;

        performanceStatsRef.current = {
          fps: computedFps,
          spatialGridTime: tGridEnd - tGridStart,
          aiTrafficTime: tAiEnd - tAiStart,
          pedestriansTime: tPedEnd - tPedStart,
          physicsTime: tPhysEnd - tPhysStart,
          viewportTime: tVpEnd - tVpStart,
          renderTime: tRenderEnd - tRenderStart,
          minimapTime: tMinimapEnd - tMinimapStart,
          totalFrameTime: totalFrameMs,
          vehiclesTotal: world.vehicles.length,
          vehiclesVisible: vpVehicles.length,
          pedestriansTotal: world.pedestrians.length,
          pedestriansVisible: vpPedestrians.length,
          particlesTotal: world.particles.length
        };

        // Push frame data to ring buffer
        perfHistoryRef.current.push({ ...performanceStatsRef.current });
        if (perfHistoryRef.current.length > 300) {
          perfHistoryRef.current.shift();
        }

        // Trigger throttled state update for UI
        perfUiTimerRef.current += dt;
        if (perfUiTimerRef.current >= 0.15) {
          perfUiTimerRef.current = 0;
          setCurrentPerfStats({ ...performanceStatsRef.current });
        }
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    }); // close loadMap().then()

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (cleanupListeners) cleanupListeners();
    };
  }, []); // Run only ONCE!

  // --- TOGGLE TURN SIGNAL ---
  const toggleTurnSignal = (signal: 'left' | 'right' | 'hazard') => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;

    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;

    if (veh.turnSignal === signal) {
      veh.turnSignal = 'none';
      setPlayerTurnSignal('none');
    } else {
      veh.turnSignal = signal;
      setPlayerTurnSignal(signal);
      sound.playTurnSignalTick(true);
    }
  };

  // --- TOGGLE HEADLIGHT MODE (OFF / LOW BEAM / HIGH BEAM) ---
  const toggleHeadlights = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;

    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;

    const nextMode: 'off' | 'low' | 'high' =
      veh.headlightMode === 'off' ? 'low' : veh.headlightMode === 'low' ? 'high' : 'off';
    veh.headlightMode = nextMode;
    veh.headlightsOn = nextMode !== 'off';
    setPlayerHeadlightMode(nextMode);
  };

  // --- VEHICLE ACTIONS FOR RADIAL MENU ---
  const handleToggleWipers = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.wipersOn = !veh.wipersOn;
    sound.playUseItem();
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleSiren = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.sirenOn = !veh.sirenOn;
    if (veh.sirenOn) sound.playHorn('police');
    else sound.stopHorn();
    setVitalsRefreshTick(t => t + 1);
  };

  const handleChangeHeaterMode = (mode: 'off' | 'low' | 'med' | 'high') => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.heaterMode = mode;
    sound.playUseItem();
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleEngine = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh || !veh.engineState) return;
    const eng = veh.engineState;
    
    if (eng.engineRunning) {
      eng.engineRunning = false;
      eng.engineStalled = false;
      sound.stopEngine();
      if (!player.notifications) player.notifications = [];
      player.notifications.push({ id: 'eng_off_' + Date.now(), text: 'Двигатель заглушен', color: '#fbbf24', timer: 2.5 });
    } else {
      if (eng.isSeized) {
        sound.playCollision(0.15);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_seized_' + Date.now(), text: '💥 Двигатель заклинил при аварии! Запуск невозможен.', color: '#ef4444', timer: 3.5 });
      } else if ((eng.engineHealth ?? 100) <= 12) {
        sound.playCollision(0.15);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_dead_' + Date.now(), text: '⚠️ Блок двигателя разрушен! Требуется ремонт.', color: '#ef4444', timer: 3.5 });
      } else if (!eng.starterWorking) {
        sound.playCollision(0.1);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_starter_' + Date.now(), text: '⚡ Стартер разбит или поврежден!', color: '#ef4444', timer: 3.0 });
      } else if (eng.batteryCharge <= 5) {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_batt_' + Date.now(), text: '🔋 Аккумулятор разряжен в 0%!', color: '#ef4444', timer: 3.0 });
      } else {
        eng.engineRunning = true;
        eng.engineStalled = false;
        eng.isStalled = false;
        if (eng.engineRPM < 800) {
          eng.engineRPM = 850;
        }
        sound.startEngine();
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_on_' + Date.now(), text: 'Двигатель запущен', color: '#34d399', timer: 2.5 });
      }
    }
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleWindow = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.windowOpen = !veh.windowOpen;
    sound.playUseItem();
    const msg = veh.windowOpen ? 'Окно приоткрыто (сквозняк выравнивает влажность)' : 'Окно закрыто';
    if (!player.notifications) player.notifications = [];
    player.notifications.push({
      id: 'win_' + Date.now(),
      text: msg,
      color: '#38bdf8',
      timer: 2.5
    });
    setVitalsRefreshTick(t => t + 1);
  };

  // --- MANUAL & AUTOMATIC GEAR SELECTOR HANDLER ---
  const handleSelectGear = (newGear: 'P' | 'R' | 'N' | 'D' | number | string) => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh || !veh.engineState) return;

    const eng = veh.engineState;

    if (eng.transmissionJammed) {
      sound.playCollision(0.18);
      if (!player.notifications) player.notifications = [];
      player.notifications.push({
        id: 'trans_jam_' + Date.now(),
        text: '⚠️ Коробка передач заклинила в результате аварии!',
        color: '#ef4444',
        timer: 3.0,
      });
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    if (typeof newGear === 'string' && ['P', 'R', 'N', 'D'].includes(newGear.toUpperCase())) {
      const mode = newGear.toUpperCase() as 'P' | 'R' | 'N' | 'D';
      eng.autoGearMode = mode;
      setGear(mode);
      if (mode === 'P') {
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;
        eng.currentGear = 0;
      } else if (mode === 'R') {
        eng.currentGear = -1;
      } else if (mode === 'N') {
        eng.currentGear = 0;
      } else if (mode === 'D') {
        eng.currentGear = Math.max(1, eng.currentGear || 1);
      }
      sound.playGearShift();
      if (!player.notifications) player.notifications = [];
      player.notifications.push({
        id: 'gear_' + Date.now(),
        text: `АКПП: Режим [${mode}]`,
        color: mode === 'P' ? '#ef4444' : mode === 'R' ? '#f59e0b' : mode === 'N' ? '#94a3b8' : '#38bdf8',
        timer: 1.5,
      });
    } else if (typeof newGear === 'number' || newGear === 'R' || newGear === 'N') {
      const g = newGear === 'R' ? -1 : newGear === 'N' ? 0 : Number(newGear);
      eng.currentGear = g;
      setGear(g === -1 ? 'R' : g === 0 ? 'N' : String(g));
      sound.playGearShift();
      if (!player.notifications) player.notifications = [];
      player.notifications.push({
        id: 'gear_' + Date.now(),
        text: `МКПП: Передача [${g === -1 ? 'R' : g === 0 ? 'N' : g}]`,
        color: '#38bdf8',
        timer: 1.5,
      });
    }
    setVitalsRefreshTick(t => t + 1);
  };

  // --- ENTER / EXIT VEHICLE HANDLER ---
  const handleEnterExitVehicle = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world) return;

    if (player.isInVehicle) {
      // Exit current vehicle
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        veh.isPlayerControlled = false;
        veh.isParked = true;
        veh.turnSignal = 'none';
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;

        // Position player to driver-side door
        const doorAngle = veh.angle - Math.PI / 2;
        player.x = veh.x + Math.cos(doorAngle) * (veh.width / 2 + 18);
        player.y = veh.y + Math.sin(doorAngle) * (veh.width / 2 + 18);
        player.vx = 0;
        player.vy = 0;
        player.isInVehicle = false;
        player.currentVehicleId = null;

        setIsInVehicle(false);
        setActiveCarName('');
        setSpeedKmh(0);
        setPlayerTurnSignal('none');
        if (veh.engineState) {
          veh.engineState.engineRunning = false;
        }
        sound.stopEngine();
        sound.playCarDoor();
      }
    } else {
      // Find closest vehicle within interaction radius
      let closestVeh: Vehicle | null = null;
      let minDist = 75;

      for (const veh of world.vehicles) {
        const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
        if (dist < minDist) {
          minDist = dist;
          closestVeh = veh;
        }
      }

      if (closestVeh) {
        closestVeh.isPlayerControlled = true;
        closestVeh.isParked = false;
        closestVeh.headlightsOn = true;
        closestVeh.aiState = 'driving';
        if (closestVeh.engineState) {
          closestVeh.engineState.engineRunning = true;
          closestVeh.engineState.isStalled = false;
          closestVeh.engineState.engineStalled = false;
          if (closestVeh.engineState.engineRPM < 800) {
            closestVeh.engineState.engineRPM = 850;
          }
          if (closestVeh.engineState.transmissionType === 'AUTO') {
            closestVeh.engineState.autoGearMode = 'D';
            closestVeh.engineState.currentGear = 1;
            setGear('D');
          } else {
            if (closestVeh.engineState.currentGear <= 0) {
              closestVeh.engineState.currentGear = 1;
            }
            setGear(String(closestVeh.engineState.currentGear));
          }
        } else {
          setGear('D');
        }

        player.isInVehicle = true;
        player.currentVehicleId = closestVeh.id;
        player.x = closestVeh.x;
        player.y = closestVeh.y;

        setIsInVehicle(true);
        const cfg = CAR_CONFIGS[closestVeh.type];
        setActiveCarName(cfg.name);
        sound.playCarDoor();
        sound.startEngine();
      }
    }
  };

  // --- INTERACT HANDLER (ENTER / EXIT VEHICLE OR BUILDING) ---
  const handleInteract = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world) return;

    if (player.isInsideBuilding) {
      const bld = world.buildings.find(b => b.id === player.insideBuildingId);
      if (bld) {
        setFadeActive(true);
        sound.playCarDoor();

        setTimeout(() => {
          const currentFloor = player.currentFloor ?? 0;
          const layout = generateBuildingLayout(bld, currentFloor);
          const relX = player.x - bld.x;
          const relY = player.y - bld.y;

          // Find the exit zone closest to the player's current position
          let bestExit = layout.exits[0] || layout.exitZone;
          let bestDist = Infinity;
          for (const ex of (layout.exits || [layout.exitZone])) {
            const d = Math.hypot(relX - (ex.x + ex.width / 2), relY - (ex.y + ex.height / 2));
            if (d < bestDist) {
              bestDist = d;
              bestExit = ex;
            }
          }

          const ents = getAllBuildingEntrances(bld);
          let targetEnt = ents[0];
          if (bestExit.entranceIndex !== undefined && ents[bestExit.entranceIndex]) {
            targetEnt = ents[bestExit.entranceIndex];
          } else {
            // Find entrance closest to the exit zone
            let minEntDist = Infinity;
            for (const ent of ents) {
              const d = Math.hypot((ent.x - bld.x) - (bestExit.x + bestExit.width / 2), (ent.y - bld.y) - (bestExit.y + bestExit.height / 2));
              if (d < minEntDist) {
                minEntDist = d;
                targetEnt = ent;
              }
            }
          }

          let exitX = targetEnt.x;
          let exitY = targetEnt.y + 14;
          if (targetEnt.side === 'north') {
            exitY = targetEnt.y - 14;
          } else if (targetEnt.side === 'south') {
            exitY = targetEnt.y + 14;
          } else if (targetEnt.side === 'west') {
            exitX = targetEnt.x - 14;
            exitY = targetEnt.y;
          } else if (targetEnt.side === 'east') {
            exitX = targetEnt.x + 14;
            exitY = targetEnt.y;
          }

          player.x = exitX;
          player.y = exitY;
          player.isInsideBuilding = false;
          player.insideBuildingId = null;
          player.currentFloor = 0;

          cameraRef.current.x = exitX;
          cameraRef.current.y = exitY;
          cameraRef.current.targetX = exitX;
          cameraRef.current.targetY = exitY;

          setTimeout(() => {
            setFadeActive(false);
          }, 150);
        }, 200);
        return;
      }
    }

    if (player.isInVehicle) {
      handleEnterExitVehicle();
      return;
    }

    // Outside, check near building entrance to enter
    let closestBld: Building | null = null;
    let minDist = 45;

    for (const bld of world.buildings) {
      if (bld.type === 'park_monument') continue;
      const ents = getAllBuildingEntrances(bld);
      for (const ent of ents) {
        const dist = Math.hypot(player.x - ent.x, player.y - ent.y);
        if (dist < minDist) {
          minDist = dist;
          closestBld = bld;
        }
      }
    }

    if (closestBld) {
      const bld = closestBld;
      setFadeActive(true);
      sound.playCarDoor();

      setTimeout(() => {
        player.isInsideBuilding = true;
        player.insideBuildingId = bld.id;
        player.currentFloor = 0;

        const ents = getAllBuildingEntrances(bld);
        let closestEntIndex = 0;
        let minEntDist = Infinity;
        for (let i = 0; i < ents.length; i++) {
          const ent = ents[i];
          const d = Math.hypot(player.x - ent.x, player.y - ent.y);
          if (d < minEntDist) {
            minEntDist = d;
            closestEntIndex = i;
          }
        }

        const layout = generateBuildingLayout(bld, 0);
        const exitZone = (layout.exits && layout.exits[closestEntIndex])
          ? layout.exits[closestEntIndex]
          : (layout.exits[0] || layout.exitZone);

        // Place player just in front of that section's exit door inside the entrance vestibule
        let enterX = exitZone.x + exitZone.width / 2;
        let enterY = exitZone.y + exitZone.height / 2;
        if (exitZone.x <= 10) {
          enterX = exitZone.x + exitZone.width + 12;
        } else if (exitZone.x >= bld.width - 20) {
          enterX = exitZone.x - 12;
        } else if (exitZone.y <= 10) {
          enterY = exitZone.y + exitZone.height + 12;
        } else {
          enterY = exitZone.y - 12;
        }

        const newPX = bld.x + enterX;
        const newPY = bld.y + enterY;
        player.x = newPX;
        player.y = newPY;

        cameraRef.current.x = newPX;
        cameraRef.current.y = newPY;
        cameraRef.current.targetX = newPX;
        cameraRef.current.targetY = newPY;

        setTimeout(() => {
          setFadeActive(false);
        }, 150);
      }, 200);
      return;
    }

    handleEnterExitVehicle();
  };

  const handleInteractE = () => {
    const p = playerRef.current;
    const world = worldRef.current;
    if (!p) return;

    if (p.isInVehicle) {
      setIsRadialMenuOpen(prev => !prev);
    } else {
      const currentSlot = selectedHotbarIndexRef.current ?? 0;
      const selectedItem = p?.inventory?.[currentSlot];

      if (p.isInsideBuilding) {
        // Resolve building directly to guarantee 100% correct shop catalog
        const bld = world?.buildings.find(b => b.id === p.currentBuildingId);
        let hasStandaloneShop = false;
        let resolvedType: CityShop['type'] = 'supermarket';
        let resolvedTitle = 'Супермаркет "Пятёрочка 24/7"';

        if (bld) {
          if (bld.shopBrand === 'pharmacy_36_6' || bld.type === 'hospital') {
            resolvedType = 'pharmacy';
            resolvedTitle = bld.nameRu || 'Аптека "36.6"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'cofix_bakery') {
            resolvedType = 'cafe';
            resolvedTitle = bld.nameRu || 'Кафе & Пекарня "Cofix & Bakery"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'bean_bistro') {
            resolvedType = 'cafe';
            resolvedTitle = bld.nameRu || 'Кафе & Кофейня "Bean & Bistro"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'pitstop_service' || bld.type === 'car_dealership') {
            resolvedType = 'auto_shop';
            resolvedTitle = bld.nameRu || 'Автомастерская & Сервис "PIT-STOP"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'splav_gear') {
            resolvedType = 'gear_shop';
            resolvedTitle = bld.nameRu || 'Магазин "Охота & Туризм Сплав"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'dodo_pizza') {
            resolvedType = 'pizzeria';
            resolvedTitle = bld.nameRu || 'Пиццерия "Додо Пицца"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'perekrestok') {
            resolvedType = 'supermarket';
            resolvedTitle = bld.nameRu || 'Супермаркет "Перекрёсток 24/7"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'pyaterochka') {
            resolvedType = 'supermarket';
            resolvedTitle = bld.nameRu || 'Супермаркет "Пятёрочка 24/7"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'vkusno_tochka') {
            resolvedType = 'fast_food';
            resolvedTitle = bld.nameRu || 'Ресторан "Вкусно — и точка"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'mvideo') {
            resolvedType = 'electronics';
            resolvedTitle = bld.nameRu || 'Гипермаркет электроники "М.Видео"';
            hasStandaloneShop = true;
          } else if (bld.shopBrand === 'sportmaster') {
            resolvedType = 'sports_shop';
            resolvedTitle = bld.nameRu || 'Спортивный гипермаркет "Спортмастер"';
            hasStandaloneShop = true;
          } else if (bld.type === 'police_station') {
            resolvedType = 'gear_shop';
            resolvedTitle = 'Арсенал & Снаряжение полиции';
            hasStandaloneShop = true;
          } else if (nearShopRef.current) {
            resolvedType = nearShopRef.current.type;
            resolvedTitle = nearShopRef.current.nameRu;
            hasStandaloneShop = true;
          }
        } else if (nearShopRef.current) {
          resolvedType = nearShopRef.current.type;
          resolvedTitle = nearShopRef.current.nameRu;
          hasStandaloneShop = true;
        }

        if (hasStandaloneShop) {
          setShopTitle(resolvedTitle);
          setShopType(resolvedType);
          setIsShopOpen(true);
          sound.playUseItem();
        } else if (selectedItem && selectedItem.usable) {
          // E key uses/takes a bite/sip/pill from the selected hotbar item
          useItemOnPlayer(p, currentSlot, world || undefined);
          sound.resume();
          setVitalsRefreshTick(t => t + 1);
        } else {
          // Fallback: Try to pick up nearest litter first, then ground items
          if (pickupNearbyLitter(p, world)) {
            // Litter picked up successfully
          } else if (world && world.groundItems && world.groundItems.length > 0) {
            let closestGI = null;
            let minDist = 75;
            for (const gi of world.groundItems) {
              const d = Math.hypot(p.x - gi.x, p.y - gi.y);
              if (d < minDist) {
                minDist = d;
                closestGI = gi;
              }
            }
            if (closestGI) {
              pickupGroundItem(p, world, closestGI);
            }
          }
        }
      } else if (nearShopRef.current) {
        setShopTitle(nearShopRef.current.nameRu);
        setShopType(nearShopRef.current.type);
        setIsShopOpen(true);
        sound.playUseItem();
      } else if (selectedItem && selectedItem.usable) {
        // E key uses/takes a bite/sip/pill from the selected hotbar item
        useItemOnPlayer(p, currentSlot, world || undefined);
        sound.resume();
        setVitalsRefreshTick(t => t + 1);
      } else {
        // Fallback: Try to pick up nearest litter first, then ground items
        if (pickupNearbyLitter(p, world)) {
          // Litter picked up successfully
        } else if (world && world.groundItems && world.groundItems.length > 0) {
          let closestGI = null;
          let minDist = 75;
          for (const gi of world.groundItems) {
            const d = Math.hypot(p.x - gi.x, p.y - gi.y);
            if (d < minDist) {
              minDist = d;
              closestGI = gi;
            }
          }
          if (closestGI) {
            pickupGroundItem(p, world, closestGI);
          }
        }
      }
    }
  };

  const handleSelectFloor = (floor: number) => {
    const player = playerRef.current;
    const world = worldRef.current;
    if (!player || !player.isInsideBuilding || !player.insideBuildingId || !world) return;

    sound.playAlert();
    setFadeActive(true);

    setTimeout(() => {
      player.currentFloor = floor;
      const bld = world.buildings.find(b => b.id === player.insideBuildingId);
      if (bld) {
        const layout = generateBuildingLayout(bld, floor);
        const relX = player.x - bld.x;
        const relY = player.y - bld.y;

        // Find elevator zone in the target floor matching player's current section or position
        let bestElevator = layout.elevators[0] || layout.elevatorZone;
        let minElDist = Infinity;
        for (const el of (layout.elevators || [layout.elevatorZone])) {
          const d = Math.hypot(relX - (el.x + el.width / 2), relY - (el.y + el.height / 2));
          if (d < minElDist) {
            minElDist = d;
            bestElevator = el;
          }
        }

        const destX = bld.x + bestElevator.x + bestElevator.width / 2;
        const destY = bld.y + (bestElevator.y < bld.height / 2 ? bestElevator.y + bestElevator.height + 12 : bestElevator.y - 12);
        player.x = destX;
        player.y = destY;

        cameraRef.current.x = destX;
        cameraRef.current.y = destY;
        cameraRef.current.targetX = destX;
        cameraRef.current.targetY = destY;
      }

      setTimeout(() => {
        setFadeActive(false);
      }, 150);
    }, 250);
  };

  // Reset vehicle if flipped or stuck
  const handleResetVehicle = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (world && player.isInVehicle && player.currentVehicleId) {
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;
        veh.steerAngle = 0;
        veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
        veh.engineState = createDefaultEngineState(veh.type);
        veh.fuelSystem = createDefaultFuelSystem(veh.type);
        setDamageDetails({
          engineSmoking: false,
          engineFire: false,
          windshieldCracked: false,
          hoodBuckled: false,
          lightsBroken: false
        });
        sound.playCarDoor();
      }
    }
  };

  // Repair/reset damage of all vehicles in the world
  const handleResetAllVehiclesDamage = () => {
    const world = worldRef.current;
    if (!world) return;
    for (const veh of world.vehicles) {
      veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
      veh.engineState = createDefaultEngineState(veh.type);
      veh.fuelSystem = createDefaultFuelSystem(veh.type);
    }
    setDamageDetails({
      engineSmoking: false,
      engineFire: false,
      windshieldCracked: false,
      hoodBuckled: false,
      lightsBroken: false
    });
    sound.playCarDoor();
  };

  // Cure/reset all limb injuries and restore health/pain levels of the player
  const handleResetPlayerInjuries = () => {
    const player = playerRef.current;
    if (player) {
      player.bodyState = defaultBodyState();
      player.needs.health = 100;
      player.needs.hunger = 100;
      player.needs.thirst = 100;
      player.needs.energy = 100;
      player.needs.sleepiness = 0;
      player.isFainting = false;
      player.faintTimer = 0;
      player.needsHospitalEvacuation = false;
      player.isHospitalized = false;
      player.hospitalTimer = 0;
      setVitalsRefreshTick((t) => t + 1);
      sound.playUseItem();
      addPlayerNotification(player, '🩹 Все травмы конечностей исцелены! Здоровье восстановлено.', 'heal');
    }
  };

  // Teleport player and vehicle (if driving) to a chosen spawn location
  const handleTeleportToLocation = (loc: SpawnLocation) => {
    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world) return;

    setCurrentSpawnId(loc.id);
    setIsSpawnMenuOpen(false);

    if (player.isInVehicle && player.currentVehicleId) {
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        veh.x = loc.x;
        veh.y = loc.y;
        veh.vx = 0;
        veh.vy = 0;
        veh.speed = 0;
        veh.angularVelocity = 0;
        veh.lateralVelocity = 0;
        veh.isDrifting = false;
        veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
        veh.engineState = createDefaultEngineState(veh.type);
        veh.fuelSystem = createDefaultFuelSystem(veh.type);
      }
    }

    player.x = loc.x;
    player.y = loc.y;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;

    camera.x = loc.x;
    camera.y = loc.y;
    camera.targetX = loc.x;
    camera.targetY = loc.y;
    camera.targetZoom = 1.15;

    sound.playCarDoor();
  };

  // --- MINIMAP RENDERER ---
  const renderMinimap = (world: GameWorld, player: Player, camera: Camera, expanded: boolean) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#060a12';
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    if (expanded) {
      // Whole City Map Overview Mode
      const scale = w / world.width;
      ctx.scale(scale, scale);

      // Terrain / Parks
      ctx.fillStyle = '#064e3b30';
      ctx.fillRect(100, 100, 2600, 2600); // Forest
      ctx.fillRect(3700, 2100, 1400, 1400); // Central Park

      // Buildings
      ctx.fillStyle = '#1e293b70';
      for (const bld of world.buildings) {
        if (bld.type !== 'park_monument') {
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        }
      }

      // Roads
      ctx.fillStyle = '#334155';
      for (const road of world.roads) {
        if (road.direction === 'horizontal') {
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
        } else {
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
        }
      }

      // Parkings
      ctx.fillStyle = 'rgba(30, 58, 138, 0.4)';
      for (const pk of world.parkings) {
        ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
      }

      // Fountain
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4400, 2800, 45, 0, Math.PI * 2);
      ctx.fill();

      // GPS Route
      if (world.gpsPath && world.gpsPath.length > 1) {
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 18;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(world.gpsPath[0].x, world.gpsPath[0].y);
        for (let i = 1; i < world.gpsPath.length; i++) {
          ctx.lineTo(world.gpsPath[i].x, world.gpsPath[i].y);
        }
        ctx.stroke();
      }

      if (world.gpsDestination) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(world.gpsDestination.x, world.gpsDestination.y, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // Traffic Lights
      for (const inter of world.intersections) {
        const phase = inter.phases?.[inter.currentPhaseIndex] || inter.phases?.[0];
        const isGreen = phase ? (phase.nsState === 'green' || phase.nsState === 'green_flashing') : false;
        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vehicles
      for (const veh of world.vehicles) {
        ctx.fillStyle = veh.isPlayerControlled ? '#38bdf8' : (veh.isParked ? '#64748b' : '#f59e0b');
        ctx.fillRect(veh.x - 12, veh.y - 12, 24, 24);
      }

      // Player Point
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else {
      // Tactical Radar Minimap (Centered on Player, Rotated with Camera)
      const radarRange = minimapRangeRef.current || 550;
      const scale = w / (radarRange * 2);

      ctx.translate(w / 2, h / 2);
      ctx.rotate(-camera.angle - Math.PI / 2);
      ctx.scale(scale, scale);
      ctx.translate(-player.x, -player.y);

      // Parks & Terrain
      ctx.fillStyle = '#064e3b35';
      ctx.fillRect(100, 100, 2600, 2600); // Forest
      ctx.fillRect(3700, 2100, 1400, 1400); // Central Park

      // Fountain
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(4400, 2800, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bae6fd';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Buildings Footprints
      ctx.fillStyle = '#1e293b80';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      for (const bld of world.buildings) {
        if (bld.type !== 'park_monument') {
          ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
          ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
        }
      }

      // Parking Lots
      ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      for (const pk of world.parkings) {
        ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
        ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);
      }

      // Roads
      ctx.fillStyle = '#334155';
      for (const road of world.roads) {
        if (road.direction === 'horizontal') {
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
        } else {
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
        }
      }

      // GPS Route Line on Radar
      if (world.gpsPath && world.gpsPath.length > 1) {
        ctx.strokeStyle = '#06b6d4'; // Glowing cyan
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(world.gpsPath[0].x, world.gpsPath[0].y);
        for (let i = 1; i < world.gpsPath.length; i++) {
          ctx.lineTo(world.gpsPath[i].x, world.gpsPath[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 12]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // GPS Destination Flag
      if (world.gpsDestination) {
        const dest = world.gpsDestination;
        ctx.save();
        ctx.translate(dest.x, dest.y);
        ctx.fillStyle = '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Intersections & Traffic Lights
      for (const inter of world.intersections) {
        const phase = inter.phases?.[inter.currentPhaseIndex] || inter.phases?.[0];
        const isGreen = phase ? (phase.nsState === 'green' || phase.nsState === 'green_flashing') : false;
        ctx.fillStyle = isGreen ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // City Establishments & Shops (🛒 💊 🔧 ☕ 🔦)
      for (const shop of CITY_SHOPS) {
        ctx.fillStyle = shop.badgeColor;
        ctx.beginPath();
        ctx.arc(shop.x, shop.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shop.icon, shop.x, shop.y);
      }

      // NPC Cars (Yellow / Slate)
      for (const veh of world.vehicles) {
        if (!veh.isPlayerControlled) {
          ctx.fillStyle = veh.isParked ? '#64748b' : '#f59e0b';
          ctx.beginPath();
          ctx.arc(veh.x, veh.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pedestrians (Purple dots)
      ctx.fillStyle = '#c084fc';
      for (const ped of world.pedestrians) {
        ctx.beginPath();
        ctx.arc(ped.x, ped.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player Heading Direction Arrow
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  };

  const toggleSoundMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div id="game-container" className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* Primary Canvas */}
      <canvas
        id="main-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* TOP-LEFT: CITY HUD & ATMOSPHERE */}
      <div id="hud-top-left" className="absolute top-4 left-4 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-2.5 shadow-xl text-white flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-sky-400 animate-pulse" />
            <span className="font-semibold text-sm tracking-wide">{streetName}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <button
            onClick={() => setIsPerfConsoleOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs rounded-lg px-2 py-1 transition-all duration-200 border cursor-pointer hover:scale-[1.03] ${
              isPerfConsoleOpen
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-400 font-semibold shadow-inner'
                : 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
            title="Профайлер нагрузки [~]"
            id="perf-profiler-btn"
          >
            <span className={`w-2 h-2 rounded-full ${
              fps >= 45 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' :
              fps >= 25 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse' :
              'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)] animate-ping'
            }`} />
            <span>{fps} FPS</span>
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-xs text-slate-400">
            {trafficCount} Cars · {pedCount} Peds
          </div>

          <div className="h-4 w-px bg-slate-700" />
          {/* Menu dropdown trigger */}
          <button
            id="quick-settings-toggle-btn"
            onClick={() => setIsQuickMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-all"
            title="Настройки среды / Городское меню"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Settings Dropdown */}
        {isQuickMenuOpen && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 shadow-2xl flex flex-wrap gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150 max-w-sm">
            <button
              id="time-toggle-btn"
              onClick={cycleTimePreset}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
              title="Переключить время суток (T)"
            >
              {getTimeLabelName(timeHour) === 'Morning' && <Sunrise className="w-3.5 h-3.5 text-amber-400" />}
              {getTimeLabelName(timeHour) === 'Day' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
              {getTimeLabelName(timeHour) === 'Sunset' && <Sunrise className="w-3.5 h-3.5 text-orange-400" />}
              {getTimeLabelName(timeHour) === 'Night' && <Moon className="w-3.5 h-3.5 text-sky-300" />}
              <span className="capitalize">{getTimeLabelName(timeHour)}</span>
            </button>

            <button
              id="weather-toggle-btn"
              onClick={cycleWeather}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
              title="Переключить погоду"
            >
              {weather === 'clear' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
              {weather === 'rain' && <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
              {weather === 'fog' && <Cloud className="w-3.5 h-3.5 text-slate-300" />}
              {weather === 'storm' && <CloudLightning className="w-3.5 h-3.5 text-purple-400" />}
              <span className="capitalize">{weather}</span>
            </button>

            <button
              id="sound-toggle-btn"
              onClick={toggleSoundMute}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isMuted ? 'Mute' : 'Звук'}</span>
            </button>

            <button
              id="touch-toggle-btn"
              onClick={() => setIsMobileTouch((prev) => !prev)}
              className={`border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all ${
                isMobileTouch
                  ? 'bg-sky-950/80 border-sky-500/40 text-sky-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Переключить сенсорный интерфейс"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Тач {isMobileTouch ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>

            <button
              id="spawn-point-btn"
              onClick={() => {
                setIsSpawnMenuOpen(true);
                setIsQuickMenuOpen(false);
              }}
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 flex items-center gap-1.5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Спавн</span>
            </button>

            <button
              id="open-ai-console-btn"
              onClick={() => {
                setIsConsoleOpen(true);
                setIsQuickMenuOpen(false);
              }}
              className="bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-indigo-200 flex items-center gap-1.5 transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI Console</span>
            </button>

            <button
              id="reset-all-damage-btn"
              onClick={handleResetAllVehiclesDamage}
              className="bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-rose-200 flex items-center gap-1.5 transition-all"
              title="Сбросить повреждения всех транспортных средств"
            >
              <Wrench className="w-3.5 h-3.5 text-rose-400" />
              <span>Починить всё</span>
            </button>

            <button
              id="reset-player-injuries-btn"
              onClick={handleResetPlayerInjuries}
              className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 flex items-center gap-1.5 transition-all"
              title="Вылечить все травмы и переломы персонажа"
            >
              <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
              <span>Вылечить себя</span>
            </button>

            <button
              id="creative-mode-toggle-btn"
              onClick={() => {
                const newVal = !isCreativeMode;
                setIsCreativeMode(newVal);
                setIsFlying(newVal);
                setIsInvincible(newVal);
                if (!newVal) {
                  setActivePlacement(null);
                  activePlacementRef.current = null;
                }
                const player = playerRef.current;
                if (player) {
                  addPlayerNotification(
                    player, 
                    newVal ? 'Режим Творчества ВКЛЮЧЕН! Открыта панель управления.' : 'Режим Творчества ВЫКЛЮЧЕН.', 
                    newVal ? 'info' : 'warning'
                  );
                }
              }}
              className={`border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                isCreativeMode
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title="Переключить Режим Творчества"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isCreativeMode ? 'text-amber-400 animate-pulse' : ''}`} />
              <span>Творчество: {isCreativeMode ? 'ВКЛ' : 'ВЫКЛ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: RADAR MINIMAP & FULLSCREEN MAP TRIGGER */}
      <div id="hud-top-right" className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-auto">
        <div 
          id="minimap-radar-container"
          className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-2 shadow-2xl overflow-hidden relative group cursor-pointer active:scale-95 transition-transform"
          onClick={() => setIsFullMapOpen(true)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setIsFullMapOpen(true);
          }}
        >
          <canvas
            id="minimap-canvas"
            ref={minimapCanvasRef}
            width={140}
            height={140}
            className="rounded-xl block"
          />
          <button
            id="minimap-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullMapOpen(true);
            }}
            className="absolute bottom-3 right-3 bg-slate-950/90 group-hover:bg-sky-600 border border-slate-700 group-hover:border-sky-400 text-[10px] text-slate-200 group-hover:text-white px-2 py-0.5 rounded-md shadow flex items-center gap-1 transition-all"
          >
            <Maximize2 className="w-3 h-3 text-sky-400 group-hover:text-white" />
            <span>Карта [M]</span>
          </button>

          {/* Radar Zoom Controls */}
          <div className="absolute top-3 left-3 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimapRange((r) => Math.max(300, r - 150));
              }}
              className="w-5 h-5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-bold"
              title="Приблизить радар"
            >
              +
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMinimapRange((r) => Math.min(1000, r + 150));
              }}
              className="w-5 h-5 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded flex items-center justify-center text-xs font-bold"
              title="Отдалить радар"
            >
              -
            </button>
          </div>
        </div>
      </div>



      {/* BOTTOM-CENTER DETAILED VEHICLE INSTRUMENT CLUSTER */}
      {isInVehicle && (() => {
        const playerCar = worldRef.current && playerRef.current
          ? worldRef.current.vehicles.find((v) => v.id === playerRef.current.currentVehicleId) || null
          : null;
        return (
          <SpeedometerHUD
            vehicle={playerCar}
            speedKmh={speedKmh}
            gear={gear}
            isDrifting={isDrifting}
            isHandbraking={inputRef.current.handbrake}
            playerTurnSignal={playerTurnSignal}
            playerHeadlightMode={playerHeadlightMode}
            onToggleTurnSignal={toggleTurnSignal}
            onToggleHeadlights={toggleHeadlights}
            onToggleEngine={handleToggleEngine}
            onOpenRadialMenu={() => setIsRadialMenuOpen(true)}
            onSelectGear={handleSelectGear}
          />
        );
      })()}

      {/* MOBILE ORIENTATION GUARD */}
      <LandscapeGuard />

      {/* ADVANCED MOBILE DUAL-ZONE TOUCH CONTROLS */}
      {isMobileTouch && (() => {
        const playerCar = worldRef.current && playerRef.current && playerRef.current.isInVehicle
          ? worldRef.current.vehicles.find((v) => v.id === playerRef.current.currentVehicleId) || null
          : null;
        const eng = playerCar?.engineState;
        return (
          <MobileTouchControls
            inputRef={inputRef}
            isInVehicle={isInVehicle}
            isNearVehicle={nearbyCarPrompt}
            onEnterExitVehicle={handleInteract}
            onResetVehicle={handleResetVehicle}
            onOpenMap={() => setIsFullMapOpen(true)}
            onOpenSpawnMenu={() => setIsSpawnMenuOpen(true)}
            onToggleConsole={() => setIsConsoleOpen(true)}
            onZoomIn={() => {
              userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15);
            }}
            onZoomOut={() => {
              userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15);
            }}
            onOpenRadialMenu={() => setIsRadialMenuOpen(true)}
            activeCarName={activeCarName}
            speedKmh={speedKmh}
            activeTurnSignal={playerTurnSignal}
            onToggleTurnSignal={toggleTurnSignal}
            gear={gear}
            transmissionType={eng?.transmissionType || 'AUTO'}
            onSelectGear={handleSelectGear}
            onToggleEngine={handleToggleEngine}
            isEngineRunning={eng ? !!eng.engineRunning : true}
            onInteractE={handleInteractE}
            canInteractF={isInVehicle || nearbyCarPrompt || !!canEnterBuilding || canExitBuilding || (playerRef.current?.isInsideBuilding === true)}
            canInteractE={isInVehicle || (!!nearShop && playerRef.current?.isInsideBuilding === true) || !!playerRef.current?.inventory?.[selectedHotbarIndex]?.usable || true}
          />
        );
      })()}

      {/* FLOATING GPS NAVIGATION HUD BANNER */}
      {gpsDestination && (
        <div id="gps-hud-banner" className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-sky-400/60 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 text-white text-xs">
            <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-400/40 text-sky-300 animate-pulse flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sky-200">{gpsDestination.name || 'Точка на карте'}</span>
                <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-1.5 py-0.2 rounded border border-sky-500/30">GPS</span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-medium px-1.5 py-0.2 rounded border border-emerald-500/30">Объезд пробок/ДТП</span>
              </div>
              <span className="text-[11px] text-slate-300 font-mono">
                {Math.round(Math.hypot(gpsDestination.x - playerRef.current.x, gpsDestination.y - playerRef.current.y))} м до цели
              </span>
            </div>
            <button
              id="btn-cancel-gps"
              onClick={() => handleSetGpsTarget(null)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1.5"
              title="Отменить маршрут"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE MAP MODAL (M key) */}
      <FullScreenMap
        world={worldRef.current}
        player={playerRef.current}
        camera={cameraRef.current}
        isOpen={isFullMapOpen}
        onClose={() => setIsFullMapOpen(false)}
        onTeleport={handleTeleportToLocation}
        onSetGpsTarget={handleSetGpsTarget}
        streetName={streetName}
      />

      {/* Traffic Diagnostics & AI Console */}
      <TrafficConsole
        world={worldRef.current}
        isOpen={isConsoleOpen}
        onClose={() => setIsConsoleOpen(false)}
        onFocusVehicle={(car) => {
          cameraRef.current.x = car.x;
          cameraRef.current.y = car.y;
          cameraRef.current.targetX = car.x;
          cameraRef.current.targetY = car.y;
          cameraRef.current.targetZoom = 1.25;
          setIsConsoleOpen(false);
        }}
      />

      {/* Dynamic Performance Profiler Console */}
      <PerformanceProfiler
        isOpen={isPerfConsoleOpen}
        onClose={() => setIsPerfConsoleOpen(false)}
        stats={currentPerfStats}
        history={perfHistoryRef.current}
        onClearHistory={() => {
          perfHistoryRef.current = [];
        }}
        isMuted={isMuted}
        onToggleMute={toggleSoundMute}
      />

      {/* SPAWN LOCATION SELECTION MODAL */}
      {isSpawnMenuOpen && (
        <div 
          id="spawn-modal-overlay"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsSpawnMenuOpen(false)}
        >
          <div 
            id="spawn-modal-content"
            className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Точка спавна и быстрый переезд</h2>
                  <p className="text-slate-400 text-xs">Выберите район города для мгновенного перемещения игрока и машины</p>
                </div>
              </div>
              <button
                id="btn-close-spawn-modal"
                onClick={() => setIsSpawnMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Locations */}
            <div className="p-4 grid grid-cols-1 gap-2.5 max-h-[70vh] overflow-y-auto">
              {SPAWN_LOCATIONS.map((loc) => {
                const isCurrent = currentSpawnId === loc.id;
                return (
                  <button
                    key={loc.id}
                    id={`spawn-loc-${loc.id}`}
                    onClick={() => handleTeleportToLocation(loc)}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/50'
                        : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <span className="text-2xl pt-0.5 select-none">{loc.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{loc.nameRu}</span>
                          {isCurrent && (
                            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                              Текущая точка
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">[{loc.x}, {loc.y}]</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{loc.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>Перемещение сохраняет текущий автомобиль игрока и чинит его</span>
              <button
                onClick={() => setIsSpawnMenuOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENTER BUILDING PROMPT */}
      {canEnterBuilding && !playerRef.current.isInsideBuilding && (
        <div id="enter-building-prompt" className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-slate-900/95 border border-emerald-500/60 text-white font-semibold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md animate-bounce">
            <span className="bg-emerald-500 text-white px-2 py-0.5 rounded font-mono font-bold">F</span>
            <span>Войти в {canEnterBuilding.type === 'shop' ? 'Магазин' : canEnterBuilding.type === 'hospital' ? 'Больницу' : canEnterBuilding.type === 'police_station' ? 'Полицию' : 'Здание'}</span>
          </div>
        </div>
      )}

      {/* EXIT BUILDING PROMPT */}
      {(canExitBuilding || playerRef.current.isInsideBuilding) && (
        <div 
          id="exit-building-prompt" 
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-auto cursor-pointer"
          onClick={handleInteract}
        >
          <div className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs border-2 border-amber-300 animate-bounce active:scale-95 transition-all">
            <span className="bg-slate-950 text-amber-400 px-2.5 py-1 rounded-lg font-mono font-black text-sm">F</span>
            <span className="font-bold text-sm tracking-wide">🚪 ВЫЙТИ НА УЛИЦУ (Нажмите сюда)</span>
          </div>
        </div>
      )}

      {/* ELEVATOR / STAIRS FLOOR SELECTION MENU */}
      {activeElevatorMenu && (
        <div 
          id="elevator-modal" 
          className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-2xl p-4 shadow-2xl text-white min-w-[280px] max-w-[320px] pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 font-mono text-xs font-bold">
              {activeElevatorMenu.type === 'elevator' ? '[ЛИФТ]' : '[ЛЕСТН]'}
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-100">
                {activeElevatorMenu.type === 'elevator' ? 'Лифт здания' : 'Лестничный марш'}
              </h3>
              <p className="text-[10px] text-slate-400">Выберите этаж для перемещения</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
            {Array.from({ length: activeElevatorMenu.maxFloors }).map((_, fIdx) => {
              const isCurrent = activeElevatorMenu.currentFloor === fIdx;
              return (
                <button
                  key={fIdx}
                  onClick={() => handleSelectFloor(fIdx)}
                  className={`py-2 px-1 rounded-lg text-xs font-bold font-mono transition-all border ${
                    isCurrent
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  }`}
                >
                  {fIdx === 0 ? '1' : fIdx + 1}
                </button>
              );
            })}
          </div>

          <div className="text-[9px] text-slate-500 mt-2.5 text-center leading-normal">
            Используйте ЛКМ на кнопках этажей
          </div>
        </div>
      )}

      {/* CINEMATIC TRANSITION OVERLAY */}
      <div 
        id="fade-transition-overlay"
        className={`fixed inset-0 bg-slate-950 transition-opacity duration-200 z-[9999] pointer-events-none ${
          fadeActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* SURVIVAL VITALS HUD & QUICK HOTBAR */}
      <PlayerNeedsHUD
        player={playerRef.current}
        world={worldRef.current}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenSelfInspection={() => setIsInspectionOpen(true)}
        onSelectHotbarItem={(idx) => {
          setSelectedHotbarIndex(idx);
          selectedHotbarIndexRef.current = idx;
          if (playerRef.current) {
            playerRef.current.selectedHotbarIndex = idx;
          }
          sound.resume();
        }}
        onSelectHotbarIndex={(idx) => {
          setSelectedHotbarIndex(idx);
          selectedHotbarIndexRef.current = idx;
          if (playerRef.current) {
            playerRef.current.selectedHotbarIndex = idx;
          }
          sound.resume();
        }}
        onUseHotbarItem={(idx) => {
          setSelectedHotbarIndex(idx);
          selectedHotbarIndexRef.current = idx;
          const p = playerRef.current;
          if (p && p.inventory && p.inventory[idx]) {
            const item = p.inventory[idx];
            const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
            if (item && item.category === 'med' && TOPICAL_ITEMS.includes(item.itemId)) {
              setTreatmentModalItem({ index: idx, item });
              return;
            }
            useItemOnPlayer(p, idx, worldRef.current || undefined);
            sound.resume();
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
        selectedHotbarIndex={selectedHotbarIndex}
      />

      {/* TARGETED LIMB TREATMENT MODAL */}
      {treatmentModalItem && (
        <LimbTreatmentModal
          isOpen={!!treatmentModalItem}
          onClose={() => setTreatmentModalItem(null)}
          player={playerRef.current}
          itemIndex={treatmentModalItem.index}
          targetItem={treatmentModalItem.item}
          onApplyTreatment={(idx, injuryId) => {
            const p = playerRef.current;
            if (p) {
              useItemOnPlayer(p, idx, worldRef.current || undefined, injuryId);
              sound.resume();
              setVitalsRefreshTick((t) => t + 1);
            }
          }}
        />
      )}

      {/* SELF INSPECTION & BODY SENSATIONS MODAL */}
      <SelfInspectionModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        player={playerRef.current}
      />

      {/* FULL INVENTORY & SURROUNDINGS MANAGEMENT MODAL */}
      <InventoryModal
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        onRequestLimbTreatment={(idx, item) => {
          setIsInventoryOpen(false);
          setTreatmentModalItem({ index: idx, item });
        }}
        onSleepInBed={() => {
          const p = playerRef.current;
          if (p && p.needs) {
            p.needs.isSleeping = true;
            p.needs.sleepiness = 0;
            p.needs.energy = 100;
            p.needs.health = Math.min(100, p.needs.health + 20);
            addPlayerNotification(p, 'Вы отдохнули и восстановили силы!', 'sleep');
          }
        }}
      />

      {/* SHOP & AUTO REPAIR MODAL */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        player={playerRef.current}
        shopTitle={shopTitle}
        shopType={shopType}
        canRepairVehicle={canRepairVehicle || playerRef.current?.isInVehicle}
        onBuyItems={(items, totalCost) => {
          const p = playerRef.current;
          if (!p) return;
          const currentCash = getPlayerCash(p);
          if (currentCash >= totalCost) {
            const success = deductPlayerCash(p, totalCost);
            if (success) {
              items.forEach((item) => {
                const boughtItem = createItem(item.itemId, 1);
                addItemToPlayer(p, boughtItem);
              });
              sound.playUseItem();
              addPlayerNotification(p, `Приобретено товаров: ${items.length} (-$${totalCost})`, 'pickup');
              setVitalsRefreshTick((t) => t + 1);
            }
          } else {
            addPlayerNotification(p, 'Недостаточно денег на балансе!', 'warning');
          }
        }}
        onRepairVehicle={() => {
          const p = playerRef.current;
          const w = worldRef.current;
          if (!p || !w) return;
          const currentCash = getPlayerCash(p);
          if (currentCash < 300) {
            addPlayerNotification(p, 'Недостаточно денег для ремонта ($300)', 'warning');
            return;
          }
          let targetCar: Vehicle | null = null;
          if (p.isInVehicle && p.currentVehicleId) {
            targetCar = w.vehicles.find((v) => v.id === p.currentVehicleId) || null;
          } else {
            targetCar = w.vehicles.find((v) => Math.hypot(v.x - p.x, v.y - p.y) < 100) || null;
          }

          if (targetCar) {
            deductPlayerCash(p, 300);
            targetCar.damage = createDefaultVehicleDamage(targetCar.length, targetCar.width);
            sound.playUseItem();
            addPlayerNotification(p, '🛠️ Автомобиль полностью отремонтирован и приведен в идеальное состояние! (-$300)', 'heal');
            setVitalsRefreshTick((t) => t + 1);
          } else {
            addPlayerNotification(p, 'Поблизости не обнаружен автомобиль для ремонта', 'warning');
          }
        }}
      />

      {/* GTA-STYLE VEHICLE CONTROLS RADIAL MENU */}
      <RadialMenu
        isOpen={isRadialMenuOpen}
        onClose={() => setIsRadialMenuOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        onToggleWipers={handleToggleWipers}
        onToggleHeadlights={toggleHeadlights}
        onToggleSiren={handleToggleSiren}
        onToggleTurnSignal={toggleTurnSignal}
        onChangeHeaterMode={handleChangeHeaterMode}
        onToggleEngine={handleToggleEngine}
        onToggleWindow={handleToggleWindow}
      />

      {/* FAINTING & CONCUSSION OVERLAY (Only for non-evacuation faints) */}
      {playerRef.current?.isFainting && !playerRef.current?.needsHospitalEvacuation && (
        <div 
          id="fainting-overlay"
          className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-rose-500/40 text-white flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
            <Heart className="w-4 h-4 animate-ping" />
          </div>
          <div className="text-left">
            <h3 className="text-xs font-bold text-rose-300">ТРАВМАТИЧЕСКИЙ ШОК / КОНТУЗИЯ</h3>
            <p className="text-[11px] text-slate-300">
              Потеря сознания... Приход в себя через {Math.ceil(playerRef.current?.faintTimer || 0)}s
            </p>
          </div>
        </div>
      )}

      {/* HOSPITAL INTENSIVE CARE UNIT & TREATMENT SUMMARY */}
      {playerRef.current?.isHospitalized && (
        <div 
          id="hospital-overlay"
          className="fixed inset-0 z-[10000] bg-slate-950/92 backdrop-blur-2xl flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-500 overflow-y-auto"
        >
          <div className="relative flex flex-col max-w-2xl w-full bg-slate-900/95 border border-sky-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-950/60 my-auto">
            {/* Hospital Header */}
            <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
                  <Ambulance className="w-7 h-7" />
                </div>
                <div className="text-left">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2.5 py-0.5 rounded-full uppercase mb-1">
                    <Activity className="w-3 h-3 text-emerald-400 animate-pulse" /> Отделение Реанимации и Интенсивной Терапии (ОРИТ)
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-100 uppercase tracking-wide">
                    Городская Больница №1
                  </h1>
                </div>
              </div>

              {/* Status pill */}
              <div className="hidden sm:flex flex-col items-end">
                <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 100
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                    : 'bg-sky-950/80 text-sky-300 border-sky-600/50 animate-pulse'
                }`}>
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '✓ СТАБИЛИЗИРОВАН' : '⚡ ИНТЕНСИВНАЯ ТЕРАПИЯ'}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">
                  Койка №4 • Реанимация
                </span>
              </div>
            </div>

            {/* Live Cardiac & Vital Signs Monitor Banner */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-rose-400 font-bold uppercase flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500 animate-ping" /> Пульс (ЧСС)
                </div>
                <div className="text-lg font-mono font-black text-rose-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '74' : '88'} <span className="text-xs font-normal text-slate-400">BPM</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-sky-400" /> Давление (АД)
                </div>
                <div className="text-lg font-mono font-black text-sky-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '120/80' : '105/65'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" /> Сатурация (SpO2)
                </div>
                <div className="text-lg font-mono font-black text-emerald-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '99%' : '94%'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400" /> Капельница
                </div>
                <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? 'Окончена' : '250 мл/ч'}
                </div>
              </div>
            </div>

            {/* Treatment Progress & Stages Tracker */}
            <div className="mb-5 p-4 rounded-2xl bg-slate-950/70 border border-sky-500/20 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400" /> Прогресс Комплексной Терапии
                </div>
                <span className="text-xs font-mono font-black text-sky-400">
                  {Math.floor(playerRef.current.hospitalTreatmentProgress || 0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 mb-3">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 shadow-lg shadow-sky-500/30"
                  style={{ width: `${Math.min(100, Math.max(5, playerRef.current.hospitalTreatmentProgress || 0))}%` }}
                />
              </div>

              {/* 4 Interactive Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 25 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold">1. Анестезия</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 25 ? '✓ Выполнено' : 'В процессе...'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 50 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold">2. Инфузия</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 50 ? '✓ Выполнено' : (playerRef.current.hospitalTreatmentProgress || 0) >= 25 ? 'В процессе...' : 'Ожидание'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 75 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold">3. Обработка ран</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 75 ? '✓ Выполнено' : (playerRef.current.hospitalTreatmentProgress || 0) >= 50 ? 'В процессе...' : 'Ожидание'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 100 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}>
                  <span className="font-bold">4. Стабилизация</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '✓ Выполнено' : (playerRef.current.hospitalTreatmentProgress || 0) >= 75 ? 'В процессе...' : 'Ожидание'}</span>
                </div>
              </div>

              {/* Instant Speedup button if player is waiting */}
              {(playerRef.current.hospitalTreatmentProgress || 0) < 100 && (
                <button
                  onClick={() => {
                    if (playerRef.current) {
                      playerRef.current.hospitalTreatmentProgress = 100;
                      playerRef.current.needs.health = 100;
                      playerRef.current.needs.energy = 85;
                      playerRef.current.needs.hunger = 75;
                      playerRef.current.needs.thirst = 75;
                      if (playerRef.current.bodyState) {
                        playerRef.current.bodyState.painLevel = 0;
                        playerRef.current.bodyState.bloodLoss = 0;
                        playerRef.current.bodyState.shockLevel = 0;
                        Object.keys(playerRef.current.bodyState.bodyParts).forEach((k) => {
                          const part = (playerRef.current!.bodyState!.bodyParts as any)[k] as any[];
                          if (Array.isArray(part)) {
                            part.forEach(inj => {
                              inj.treated = true;
                              inj.severity = 0;
                            });
                          }
                        });
                      }
                      sound.playUseItem();
                    }
                  }}
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-sky-900/40 hover:bg-sky-800/60 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" /> Ускорить процедуры реанимации
                </button>
              )}
            </div>

            {/* Diagnosis & Report */}
            {playerRef.current?.evacDiagnosis && (
              <div className="space-y-3.5 text-left mb-5">
                {/* Primary Diagnosis */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-rose-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" /> Клинический Диагноз
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-100">
                    {playerRef.current.evacDiagnosis.causeName}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {playerRef.current.evacDiagnosis.description}
                  </p>
                </div>

                {/* Prescriptions & Bill */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                      Выписанные Препараты
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1">
                      {playerRef.current.evacDiagnosis.prescriptionsGiven.map((p, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800 flex flex-col justify-between">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1">
                      Медицинский Счет
                    </div>
                    <div className="text-xl font-mono font-black text-amber-300">
                      ${playerRef.current.evacDiagnosis.billAmount}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Списывается при подтверждении выписки
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Discharge Button */}
            <button
              disabled={(playerRef.current.hospitalTreatmentProgress || 0) < 100}
              onClick={() => {
                if (playerRef.current) {
                  // Deduct cash and grant prescriptions upon discharge
                  if (playerRef.current.evacDiagnosis) {
                    deductPlayerCash(playerRef.current, playerRef.current.evacDiagnosis.billAmount);
                    const cause = playerRef.current.evacCause || 'general';
                    if (!playerRef.current.inventory) playerRef.current.inventory = [];
                    if (cause === 'fire_burns') {
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.panthenol_spray, count: 1, maxStack: 6, weight: 0.18 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.spasatel_ointment, count: 1, maxStack: 8, weight: 0.08 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.painkillers, count: 2, maxStack: 10, weight: 0.05 });
                    } else if (cause === 'fractures_shock') {
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.splint, stack: 2 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.painkillers, stack: 3 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.antiseptic, stack: 1 });
                    } else if (cause === 'blood_loss') {
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.tourniquet, stack: 2 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.bandage, stack: 2 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.saline_iv, stack: 1 });
                    } else {
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.painkillers, stack: 2 });
                      playerRef.current.inventory.push({ ...ITEM_CATALOG.bandage, stack: 1 });
                    }
                  }

                  // Fully clean up all hospitalization & evacuation states
                  playerRef.current.isHospitalized = false;
                  playerRef.current.needsHospitalEvacuation = false;
                  playerRef.current.evacPhase = undefined;
                  playerRef.current.hospitalTimer = 0;
                  playerRef.current.hospitalTreatmentProgress = 0;
                  playerRef.current.evacDiagnosis = undefined;
                  playerRef.current.isFainting = false;
                  playerRef.current.faintTimer = 0;

                  sound.playUseItem();
                  addPlayerNotification(playerRef.current, 'Вы успешно выписаны из Городской Больницы №1 в полном здравии!', 'heal');
                }
              }}
              className={`w-full py-4 rounded-2xl font-black tracking-wide text-sm uppercase shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                (playerRef.current.hospitalTreatmentProgress || 0) >= 100
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? (
                <>✓ ВСТАТЬ С КОЙКИ / ВЫПИСАТЬСЯ В ГОРОД</>
              ) : (
                <>⏳ Идет интенсивная терапия ({Math.floor(playerRef.current.hospitalTreatmentProgress || 0)}%)...</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* CREATIVE MODE SIDEBAR & CONTROL PANEL */}
      {isCreativeMode && !isMainMenuOpen && (
        <div 
          id="creative-sidebar-panel" 
          className="absolute top-24 left-4 z-20 w-80 max-h-[calc(100vh-140px)] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-left duration-200 text-white"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse animate-duration-1000" />
              <span className="font-bold text-sm tracking-wide text-slate-100 uppercase">Режим Творчества</span>
            </div>
            <button 
              onClick={() => {
                setIsCreativeMode(false);
                setIsFlying(false);
                setIsInvincible(false);
                setActivePlacement(null);
                activePlacementRef.current = null;
                const player = playerRef.current;
                if (player) {
                  addPlayerNotification(player, 'Режим Творчества выключен.', 'warning');
                }
              }}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title="Закрыть режим творчества"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/30 p-1 shrink-0">
            {(['vehicles', 'props', 'items', 'cheats'] as const).map((tab) => {
              const label = 
                tab === 'vehicles' ? '🚗 Авто' :
                tab === 'props' ? '🚧 Пропы' :
                tab === 'items' ? '🎒 Вещи' : '⚡ Читы';
              return (
                <button
                  key={tab}
                  onClick={() => setCreativeTab(tab)}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    creativeTab === tab
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-inner'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {creativeTab === 'vehicles' && (
              <div className="space-y-3">
                {/* Color Picker Row */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Цвет спавна авто:</span>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    {[
                      { hex: '#f43f5e', name: 'Красный' },
                      { hex: '#f97316', name: 'Оранжевый' },
                      { hex: '#eab308', name: 'Жёлтый' },
                      { hex: '#22c55e', name: 'Зелёный' },
                      { hex: '#06b6d4', name: 'Бирюзовый' },
                      { hex: '#38bdf8', name: 'Голубой' },
                      { hex: '#a855f7', name: 'Фиолетовый' },
                      { hex: '#ffffff', name: 'Белый' },
                      { hex: '#1e293b', name: 'Чёрный' }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => {
                          setCreativeVehicleColor(col.hex);
                          if (activePlacement && activePlacement.type === 'vehicle') {
                            setActivePlacement({ ...activePlacement, color: col.hex });
                          }
                        }}
                        style={{ backgroundColor: col.hex }}
                        className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                          creativeVehicleColor === col.hex 
                            ? 'scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                            : 'border-slate-800 hover:scale-[1.05]'
                        }`}
                        title={col.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Vehicles list */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Выберите транспорт:</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {Object.entries(CAR_CONFIGS).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setActivePlacement({
                            type: 'vehicle',
                            id: key,
                            nameRu: config.name,
                            angle: 0,
                            color: creativeVehicleColor
                          });
                        }}
                        className={`w-full p-2 text-left bg-slate-950/40 hover:bg-slate-800/40 border transition-all rounded-xl flex items-center justify-between cursor-pointer group ${
                          activePlacement?.type === 'vehicle' && activePlacement.id === key
                            ? 'border-amber-500 bg-amber-500/5 text-amber-200 shadow-sm shadow-amber-500/20'
                            : 'border-slate-800/80 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-sm">
                            {config.type.includes('bus') ? '🚌' : config.type.includes('fire') ? '🚒' : config.type.includes('police') ? '🚓' : '🚗'}
                          </span>
                          <span className="text-xs font-medium truncate group-hover:text-slate-100">{config.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400/80 shrink-0">Spawn</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {creativeTab === 'props' && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Выберите проп / объект:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'cone', label: 'Дорожный конус 🚧' },
                    { id: 'bollard', label: 'Столбик ограждения 🛑' },
                    { id: 'bench', label: 'Уличная скамейка 🪵' },
                    { id: 'trash_can', label: 'Мусорный бак 🗑️' },
                    { id: 'dumpster', label: 'Мусорный контейнер 🗄️' },
                    { id: 'hydrant', label: 'Пожарный гидрант 💧' },
                    { id: 'mailbox', label: 'Почтовый ящик 📬' },
                    { id: 'lamp', label: 'Уличный фонарь 💡' },
                    { id: 'bus_stop', label: 'Автобусная остановка 🚌' },
                    { id: 'kiosk', label: 'Газетный киоск 🏪' },
                    { id: 'flowerbed', label: 'Клумба с цветами 🌸' },
                    { id: 'tire_flowerbed', label: 'Клумба из покрышки 🛞' }
                  ].map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActivePlacement({
                          type: 'prop',
                          id: prop.id,
                          nameRu: prop.label.split(' ')[0],
                          angle: 0
                        });
                      }}
                      className={`w-full p-2 text-left bg-slate-950/40 hover:bg-slate-800/40 border transition-all rounded-xl flex items-center justify-between cursor-pointer group ${
                        activePlacement?.type === 'prop' && activePlacement.id === prop.id
                          ? 'border-amber-500 bg-amber-500/5 text-amber-200 shadow-sm shadow-amber-500/20'
                          : 'border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <span className="text-xs font-medium truncate group-hover:text-slate-100">{prop.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400/80 shrink-0">Place</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {creativeTab === 'items' && (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={creativeItemSearch}
                    onChange={(e) => setCreativeItemSearch(e.target.value)}
                    placeholder="Поиск предметов..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                {/* Items Catalog List */}
                <div className="space-y-4">
                  {[
                    { title: '🍔 Еда и напитки', cat: 'food_drink' },
                    { title: '💊 Медикаменты', cat: 'med' },
                    { title: '🔧 Автоинструменты', cat: 'tool' },
                    { title: '💰 Ценности и валюта', cat: 'valuable' }
                  ].map((group) => {
                    const filteredItems = Object.entries(ITEM_CATALOG).filter(([key, item]) => {
                      const matchesCategory = 
                        group.cat === 'food_drink' ? (item.category === 'food' || item.category === 'drink') :
                        group.cat === 'med' ? (item.category === 'med') :
                        group.cat === 'valuable' ? (item.category === 'valuable') :
                        (item.category === 'tool');

                      if (!matchesCategory) return false;
                      if (!creativeItemSearch) return true;

                      const query = creativeItemSearch.toLowerCase();
                      return (
                        item.nameRu?.toLowerCase().includes(query) ||
                        item.name.toLowerCase().includes(query) ||
                        key.toLowerCase().includes(query)
                      );
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={group.cat} className="space-y-1.5">
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                          {group.title}
                        </span>
                        <div className="grid grid-cols-1 gap-1.5">
                          {filteredItems.map(([key, item]) => (
                            <div 
                              key={key} 
                              className="p-2 bg-slate-950/30 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-lg shrink-0">{item.icon || '📦'}</span>
                                <div className="overflow-hidden">
                                  <div className="font-semibold text-slate-200 truncate">{item.nameRu || item.name}</div>
                                  <div className="text-[9px] text-slate-500 truncate">{item.descriptionRu || item.description}</div>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  onClick={() => {
                                    const p = playerRef.current;
                                    if (!p) return;
                                    const created = createItem(key, 1);
                                    const success = addItemToPlayer(p, created);
                                    if (success) {
                                      addPlayerNotification(p, `Получено: ${created.nameRu || created.name} x1`, 'pickup');
                                      sound.playUseItem();
                                    } else {
                                      addPlayerNotification(p, 'Инвентарь заполнен!', 'warning');
                                    }
                                  }}
                                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] text-slate-300 font-bold transition-all cursor-pointer"
                                  title="Выдать 1 шт"
                                >
                                  +1
                                </button>
                                <button
                                  onClick={() => {
                                    const p = playerRef.current;
                                    if (!p) return;
                                    const created = createItem(key, item.maxStack || 5);
                                    const success = addItemToPlayer(p, created);
                                    if (success) {
                                      addPlayerNotification(p, `Получено: ${created.nameRu || created.name} x${item.maxStack || 5}`, 'pickup');
                                      sound.playUseItem();
                                    } else {
                                      addPlayerNotification(p, 'Инвентарь заполнен!', 'warning');
                                    }
                                  }}
                                  className="px-1.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[10px] text-white font-bold transition-all cursor-pointer"
                                  title={`Выдать полный стак (${item.maxStack || 5} шт)`}
                                >
                                  +Stack
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {creativeTab === 'cheats' && (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Чит-коды и управление:</span>
                
                {/* Flight / Noclip Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Plane className={`w-4 h-4 ${isFlying ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200">Режим полёта (Noclip)</div>
                      <div className="text-[9px] text-slate-400">Shift — ускорение полёта</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const val = !isFlying;
                      setIsFlying(val);
                      const p = playerRef.current;
                      if (p) {
                        addPlayerNotification(p, val ? 'Полёт активирован!' : 'Режим ходьбы.', val ? 'info' : 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isFlying ? 'bg-amber-500 flex justify-end' : 'bg-slate-800 flex justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow" />
                  </button>
                </div>

                {/* Invincibility Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${isInvincible ? 'text-emerald-400 animate-pulse animate-duration-1000' : 'text-slate-500'}`} />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200">Бессмертие и вечные нужды</div>
                      <div className="text-[9px] text-slate-400">Вайп травм и 100% показатели</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const val = !isInvincible;
                      setIsInvincible(val);
                      const p = playerRef.current;
                      if (p) {
                        addPlayerNotification(p, val ? 'Вы бессмертны! Травмы очищены.' : 'Режим смертности включен.', val ? 'heal' : 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isInvincible ? 'bg-emerald-500 flex justify-end' : 'bg-slate-800 flex justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow" />
                  </button>
                </div>

                {/* Give Cash Button */}
                <button
                  onClick={() => {
                    const p = playerRef.current;
                    if (p) {
                      addPlayerCash(p, 100000);
                      addPlayerNotification(p, 'Получено ₽100,000 из резерва!', 'pickup');
                      sound.playTurnSignalTick(true);
                      setVitalsRefreshTick(t => t + 1);
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-xl text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Coins className="w-4 h-4 text-amber-400 animate-bounce" />
                  <span>Выдать ₽100,000</span>
                </button>

                {/* Fix Car Button */}
                <button
                  onClick={() => {
                    handleResetAllVehiclesDamage();
                    const p = playerRef.current;
                    if (p) {
                      addPlayerNotification(p, 'Все повреждения транспорта устранены!', 'info');
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-xl text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Wrench className="w-4 h-4 text-sky-400" />
                  <span>Починить весь транспорт</span>
                </button>

                {/* Clear Spawned Items */}
                <button
                  onClick={() => {
                    const world = worldRef.current;
                    if (!world) return;
                    
                    world.vehicles = world.vehicles.filter(v => {
                      if (v.id.startsWith('spawn_')) {
                        spatialGridVehiclesRef.current.remove(v);
                        return false;
                      }
                      return true;
                    });

                    world.props = world.props.filter(p => {
                      if (p.id.startsWith('spawn_prop_')) {
                        spatialGridPropsRef.current.remove(p);
                        return false;
                      }
                      return true;
                    });

                    const p = playerRef.current;
                    if (p) {
                      addPlayerNotification(p, 'Все созданные объекты удалены!', 'info');
                    }
                  }}
                  className="w-full py-2.5 px-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/25 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Очистить созданный спавн</span>
                </button>
              </div>
            )}
          </div>
          
          {/* Footer instruction */}
          <div className="p-2 bg-slate-950/40 border-t border-slate-800 text-[9px] text-slate-500 text-center shrink-0">
            Для установки выберите авто/проп и кликните на карте.
          </div>
        </div>
      )}

      {/* PLACEMENT WORLD PREVIEW HUD GUIDE */}
      {isCreativeMode && activePlacement && !isMainMenuOpen && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-1.5 text-center pointer-events-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-150 text-white">
          <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm uppercase tracking-wider">
            <Wand2 className="w-4 h-4 animate-spin" />
            Установка: {activePlacement.nameRu}
          </div>
          <div className="text-xs text-slate-300 leading-relaxed max-w-xs">
            Перемещайте курсор по экрану для предпросмотра в мире.
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 w-full text-xs">
            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl text-slate-400 flex flex-col items-center">
              <span className="font-bold text-slate-300">Левый клик</span>
              <span>Разместить на карте</span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-xl text-slate-400 flex flex-col items-center">
              <span className="font-bold text-slate-300">Колёсико / Кл. [R]</span>
              <span>Вращение ({Math.round(activePlacement.angle * (180 / Math.PI))}°)</span>
            </div>
          </div>
          <button
            onClick={() => {
              setActivePlacement(null);
              activePlacementRef.current = null;
            }}
            className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer"
          >
            Отмена (Правый клик / Esc)
          </button>
        </div>
      )}

      {/* Main Menu Overlay */}
      {isMainMenuOpen && (
        <MainMenu
          onResume={() => setIsMainMenuOpen(false)}
          onNewGame={handleNewGame}
          saves={saves}
          onLoadSave={handleLoadSave}
          onDeleteSave={handleDeleteSave}
          onCreateSave={handleCreateSave}
          isMuted={isMuted}
          onToggleMute={toggleSoundMute}
        />
      )}
    </div>
  );
}

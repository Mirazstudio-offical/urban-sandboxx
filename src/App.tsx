import React, { useEffect, useRef, useState } from 'react';
import { 
  Building, 
  Camera, 
  GameWorld, 
  InputState, 
  Pedestrian, 
  Player, 
  SidewalkBlock,
  StreetProp,
  TimeOfDay, 
  Tree,
  Vehicle,
  WeatherType 
} from './types';
import { CAR_CONFIGS, createDefaultVehicleDamage } from './cityMap';
import { loadMap } from './loadMap';
import { SpatialGrid } from './spatialGrid';
import { updateAITraffic, updatePedestrians, updateTrafficLights } from './aiTraffic';
import { 
  updateBreakablePropsAndLivingWorld,
  updatePlayerPedestrianPhysics, 
  updateSkidMarksAndParticles, 
  updateVehiclePhysics 
} from './physics';
import { GameRenderer } from './renderer';
import { calculateGpsRoute } from './navigation';
import { sound } from './audio';
import { TrafficConsole } from './components/TrafficConsole';
import { FullScreenMap } from './components/FullScreenMap';
import { LandscapeGuard } from './components/LandscapeGuard';
import { MobileTouchControls } from './components/MobileTouchControls';
import { MainMenu } from './components/MainMenu';
import { 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudLightning,
  CloudRain,
  Compass, 
  Eye, 
  Gauge, 
  MapPin,
  Maximize2,
  Moon, 
  Navigation,
  RotateCcw,
  Settings,
  Smartphone,
  Sun, 
  Sunrise, 
  Terminal,
  Volume2, 
  VolumeX, 
  X,
  Zap 
} from 'lucide-react';

export interface SpawnLocation {
  id: string;
  name: string;
  nameRu: string;
  x: number;
  y: number;
  description: string;
  icon: string;
}

export const SPAWN_LOCATIONS: SpawnLocation[] = [
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    x: 4400,
    y: 2800,
    description: 'Парковый фонтан, аллеи со скамейками, грузовики и прогулочные зоны',
    icon: '🌳'
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Центр Города (Парковка & Небоскребы)',
    x: 4350,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковочный комплекс',
    icon: '🏙️'
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Дворовая парковка)',
    x: 2750,
    y: 2750,
    description: 'Уютный закрытый двор, подъезды, скамейки, урны, баки и припаркованные авто',
    icon: '🏢'
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Грузовая база & Склады)',
    x: 5200,
    y: 4400,
    description: 'Логистический хаб, стоянки спецтехники, грузовые терминалы и ангары',
    icon: '🚛'
  },
  {
    id: 'pine_forest',
    name: 'Pine Ridge Outpost',
    nameRu: 'Лесной Заповедник (Грунтовые тропы)',
    x: 550,
    y: 550,
    description: 'Извилистые лесные тропы, сосновый бор, пруды и бездорожье для пикапа',
    icon: '🌲'
  },
  {
    id: 'highway_junction',
    name: 'Silicon Highway Express',
    nameRu: 'Скоростное Шоссе (4-полосная магистраль)',
    x: 4000,
    y: 4000,
    description: 'Широкая магистраль с непрерывным плотным потоком AI-трафика и светофорами',
    icon: '🛣️'
  }
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Status
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isInVehicle, setIsInVehicle] = useState<boolean>(false);
  const [activeCarName, setActiveCarName] = useState<string>('');
  const [gear, setGear] = useState<'P' | 'D' | 'R'>('P');
  const [isMobileTouch, setIsMobileTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
  });
  const [timeHour, setTimeHour] = useState<number>(10.0); // 0 to 24 hours
  const [isTimeAutoCycling, setIsTimeAutoCycling] = useState<boolean>(true);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [weatherTransition, setWeatherTransition] = useState<number>(1.0);
  const [carHealth, setCarHealth] = useState<number>(100);
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
  const [playerHeadlightMode, setPlayerHeadlightMode] = useState<'off' | 'low' | 'high'>('low');
  const [fps, setFps] = useState<number>(60);
  const [streetName, setStreetName] = useState<string>('Grand Boulevard');
  const [nearbyCarPrompt, setNearbyCarPrompt] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [trafficCount, setTrafficCount] = useState<number>(0);
  const [pedCount, setPedCount] = useState<number>(0);
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
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
  const [isSpawnMenuOpen, setIsSpawnMenuOpen] = useState<boolean>(false);
  const [currentSpawnId, setCurrentSpawnId] = useState<string>('central_park');

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
      gpsDestination: gpsDestination
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

    // Restore player status
    player.x = save.playerX;
    player.y = save.playerY;
    player.angle = save.playerAngle;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.isInVehicle = save.isInVehicle;
    player.currentVehicleId = save.currentVehicleId;

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
    hairColor: '#18181b'
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

  // Initialize Game World (Runs ONCE on mount, NEVER resets when toggling day/night)
  useEffect(() => {
    sound.init();
    loadMap().then((world) => {
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

      if (code === 'Escape') {
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

      // Turn Signals (Q = Left, E = Right, Z = Hazard)
      if (code === 'KeyQ') {
        toggleTurnSignal('left');
      }
      if (code === 'KeyE') {
        toggleTurnSignal('right');
      }
      if (code === 'KeyZ') {
        toggleTurnSignal('hazard');
      }

      // Enter/Exit Vehicle (F key)
      if (code === 'KeyF') {
        handleEnterExitVehicle();
      }

      // AI Telemetry Console toggle
      if (code === 'Backquote' || code === 'F1') {
        setIsConsoleOpen((prev) => !prev);
        e.preventDefault();
      }

      // Time toggle (cycle presets)
      if (code === 'KeyT') {
        cycleTimePreset();
      }
      if (code === 'KeyC') {
        cameraRef.current.targetZoom = cameraRef.current.targetZoom < 1.0 ? 1.3 : 0.85;
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
      // Zoom in or out depending on deltaY direction
      const zoomStep = 0.08;
      if (e.deltaY < 0) {
        userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + zoomStep);
      } else {
        userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - zoomStep);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel, { passive: true });

    // --- MAIN GAME ANIMATION LOOP ---
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let animationFrameId: number;

    const gameLoop = (now: number) => {
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
        const vehGrid = spatialGridVehiclesRef.current;
        vehGrid.clear();
        world.vehicles.forEach((v) => vehGrid.insert(v));

        const pedGrid = spatialGridPedestriansRef.current;
        pedGrid.clear();
        world.pedestrians.forEach((p) => pedGrid.insert(p));

        const bldGrid = spatialGridBuildingsRef.current;

        // 2. Update Traffic Lights
        updateTrafficLights(world.intersections, dt);

        // 3. Update AI Traffic (using spatial grids and player position)
        updateAITraffic(world, dt, vehGrid, pedGrid, { x: player.x, y: player.y });

        // 4. Update Pedestrians (using spatial grids and player position)
        updatePedestrians(world, dt, vehGrid, pedGrid, bldGrid, { x: player.x, y: player.y });

        // 5. Update Player & Vehicles Physics
        const playerNearbyBuildings = bldGrid.queryRadius(
          player.x,
          player.y,
          300
        );

        if (!player.isInVehicle) {
          updatePlayerPedestrianPhysics(player, input, playerNearbyBuildings, dt, camera.angle, world.width, world.height, world);
          camera.targetX = player.x;
          camera.targetY = player.y;
          // Fixed North-Up camera for pedestrian mode prevents spinning camera loops
          camera.targetAngle = 0;
          camera.targetZoom = 1.3 * userZoomFactorRef.current;
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
            dt
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

        // 6. Throttled HUD State Updates (Run at ~12.5 Hz to prevent React re-render lag)
        hudUpdateTimerRef.current += dt;
        if (hudUpdateTimerRef.current >= 0.08) {
          hudUpdateTimerRef.current = 0;

          if (playerCar) {
            const currentSpeedKmh = Math.round(Math.abs(playerCar.speed) * 0.36);
            setSpeedKmh(currentSpeedKmh);
            setIsDrifting(playerCar.isDrifting);
            setPlayerTurnSignal(playerCar.turnSignal);
            if (playerCar.damage) {
              setCarHealth(Math.round(playerCar.damage.health));
              setDamageDetails({
                engineSmoking: !!playerCar.damage.engineSmoking,
                engineFire: !!playerCar.damage.engineFire,
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

            if (playerCar.speed > 5) setGear('D');
            else if (playerCar.speed < -5) setGear('R');
            else setGear('P');
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
        updateSkidMarksAndParticles(world, dt);
        updateBreakablePropsAndLivingWorld(world, player, dt, vehGrid);

        // 8. Smooth Camera Lerp
        camera.x += (camera.targetX - camera.x) * 6 * dt;
        camera.y += (camera.targetY - camera.y) * 6 * dt;
        camera.zoom += (camera.targetZoom - camera.zoom) * 4 * dt;

        // Smooth camera rotation lerp with slight lag/delay
        let angleDiff = (camera.targetAngle - camera.angle) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        const rotSpeed = player.isInVehicle ? 3.0 : 1.5;
        camera.angle += angleDiff * Math.min(1.0, rotSpeed * dt);

        // 9. Query objects in Camera Viewport for high-performance rendering
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

        // Advance simulation time
        if (isTimeAutoCyclingRef.current) {
          timeHourRef.current = (timeHourRef.current + dt * 0.12) % 24;
        }

        if (weatherTransitionRef.current < 1.0) {
          weatherTransitionRef.current = Math.min(1.0, weatherTransitionRef.current + dt * 0.5);
        }

        // 10. Render Scene with pre-culled viewport entities
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
          vpSidewalks
        );

        // 11. Render Minimap
        renderMinimap(world, player, camera, isMinimapExpandedRef.current);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
    };
    }); // close loadMap().then()
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
        veh.damage = createDefaultVehicleDamage();
        setCarHealth(100);
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
        veh.damage = createDefaultVehicleDamage();
        setCarHealth(100);
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

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    if (expanded) {
      // Whole City Map Overview
      const scale = w / world.width;
      ctx.scale(scale, scale);

      // Roads
      ctx.fillStyle = '#475569';
      for (const road of world.roads) {
        if (road.direction === 'horizontal') {
          ctx.fillRect(road.x1, road.y1 - road.width / 2, road.x2 - road.x1, road.width);
        } else {
          ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, road.y2 - road.y1);
        }
      }

      // GPS Route on Overview Minimap
      if (world.gpsPath && world.gpsPath.length > 1) {
        ctx.strokeStyle = '#22d3ee';
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
        const phase = inter.phases[inter.currentPhaseIndex];
        ctx.fillStyle = (phase.nsState === 'green' || phase.nsState === 'green_flashing') ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vehicles
      for (const veh of world.vehicles) {
        ctx.fillStyle = veh.isPlayerControlled ? '#38bdf8' : '#eab308';
        ctx.fillRect(veh.x - 12, veh.y - 12, 24, 24);
      }

      // Player
      ctx.fillStyle = '#38bdf8';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

    } else {
      // Local Tactical Radar (Centered on Player, Rotated with Camera)
      const radarRange = 600; // px
      const scale = w / (radarRange * 2);

      ctx.translate(w / 2, h / 2);
      ctx.rotate(-camera.angle - Math.PI / 2);
      ctx.scale(scale, scale);
      ctx.translate(-player.x, -player.y);

      // Roads
      ctx.fillStyle = '#475569';
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

      // GPS Destination Flag Marker on Radar
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

      // Intersections & Lights
      for (const inter of world.intersections) {
        const phase = inter.phases[inter.currentPhaseIndex];
        ctx.fillStyle = (phase.nsState === 'green' || phase.nsState === 'green_flashing') ? '#22c55e' : '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // NPC Cars (Yellow dots)
      ctx.fillStyle = '#eab308';
      for (const veh of world.vehicles) {
        if (!veh.isPlayerControlled) {
          ctx.beginPath();
          ctx.arc(veh.x, veh.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pedestrians (Purple dots)
      ctx.fillStyle = '#a855f7';
      for (const ped of world.pedestrians) {
        ctx.beginPath();
        ctx.arc(ped.x, ped.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Player Arrow
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);

      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
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
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{fps} FPS</span>
          </div>
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
          </div>
        )}
      </div>

      {/* TOP-RIGHT: RADAR MINIMAP & FULLSCREEN MAP TRIGGER */}
      <div id="hud-top-right" className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div 
          className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-2 shadow-2xl overflow-hidden relative group cursor-pointer"
          onClick={() => setIsFullMapOpen(true)}
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
            className="absolute bottom-3 right-3 bg-slate-950/80 group-hover:bg-sky-600 border border-slate-700 group-hover:border-sky-400 text-[10px] text-slate-300 group-hover:text-white px-2 py-0.5 rounded-md shadow flex items-center gap-1 transition-all"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Карта [M]</span>
          </button>
        </div>
      </div>

      {/* CENTER-BOTTOM: CLEAN IN-WORLD INTERACTION PROMPT */}
      {nearbyCarPrompt && (
        <div id="interaction-prompt" className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-slate-900/95 border border-sky-400/60 text-white font-semibold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs backdrop-blur-md">
            <span className="bg-sky-500 text-white px-2 py-0.5 rounded font-mono font-bold">F</span>
            <span>Войти в автомобиль</span>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT: SLEEK & REALISTIC SPEEDOMETER DASHBOARD (WHEN DRIVING) */}
      {isInVehicle && (
        <div id="speedometer-container" className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white flex flex-col gap-3 min-w-[210px]">
            {/* Digital Speedometer & Gear */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black tracking-tight text-sky-400 font-mono">{speedKmh}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">КМ/Ч</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                  gear === 'D' 
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                    : gear === 'R' 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  {gear}
                </span>

                {isDrifting && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md animate-pulse">
                    DRIFT 💨
                  </span>
                )}
              </div>
            </div>

            {/* Turn Signals & Lights Control Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-1.5">
              {/* Left Signal (Q) */}
              <button
                id="btn-signal-left"
                onClick={() => toggleTurnSignal('left')}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  playerTurnSignal === 'left' || playerTurnSignal === 'hazard'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Левый поворотник [Q]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Q</span>
              </button>

              {/* Hazard Lights (Z) */}
              <button
                id="btn-signal-hazard"
                onClick={() => toggleTurnSignal('hazard')}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  playerTurnSignal === 'hazard'
                    ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Аварийка [Z]"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Z</span>
              </button>

              {/* Right Signal (E) */}
              <button
                id="btn-signal-right"
                onClick={() => toggleTurnSignal('right')}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  playerTurnSignal === 'right' || playerTurnSignal === 'hazard'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Правый поворотник [E]"
              >
                <span>E</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {/* Headlights Toggle (L) */}
              <button
                id="btn-headlights-toggle"
                onClick={toggleHeadlights}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${
                  playerHeadlightMode === 'high'
                    ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                    : playerHeadlightMode === 'low'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-white'
                }`}
                title="Фары: Ближний / Дальний / Выкл [L]"
              >
                <span>L</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT: PEDESTRIAN HUD CARD (WHEN ON FOOT) */}
      {!isInVehicle && (
        <div id="pedestrian-hud-container" className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-white flex flex-col gap-2 min-w-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Режим пешехода</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Пешком</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-0.5">
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-[10px] text-sky-300">WASD</span>
                <span>Движение</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-[10px] text-amber-300">Shift</span>
                <span>Бег</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-[10px] text-emerald-300">Space</span>
                <span>Перекат</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <span className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono font-bold text-[10px] text-purple-300">F / E</span>
                <span>В авто</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE ORIENTATION GUARD */}
      <LandscapeGuard />

      {/* ADVANCED MOBILE DUAL-ZONE TOUCH CONTROLS */}
      {isMobileTouch && (
        <MobileTouchControls
          inputRef={inputRef}
          isInVehicle={isInVehicle}
          onEnterExitVehicle={handleEnterExitVehicle}
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
          onToggleHeadlights={toggleHeadlights}
          onToggleSiren={() => {
            const world = worldRef.current;
            const player = playerRef.current;
            if (world && player.isInVehicle && player.currentVehicleId) {
              const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
              if (veh) {
                veh.sirenOn = !veh.sirenOn;
                if (veh.sirenOn) sound.playHorn('police');
                else sound.stopHorn();
              }
            }
          }}
          activeCarName={activeCarName}
          speedKmh={speedKmh}
          activeTurnSignal={playerTurnSignal}
          onToggleTurnSignal={toggleTurnSignal}
        />
      )}

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
              <span>💡 Перемещение сохраняет текущий автомобиль игрока и чинит его</span>
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

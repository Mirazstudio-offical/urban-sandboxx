import React, { useEffect, useRef, useState } from 'react';
import { 
  Building, 
  Camera, 
  GameWorld, 
  InputState, 
  Pedestrian, 
  Player, 
  TimeOfDay, 
  Vehicle,
  WeatherType 
} from './types';
import { CAR_CONFIGS, generateCityWorld, createDefaultVehicleDamage } from './cityMap';
import { SpatialGrid } from './spatialGrid';
import { updateAITraffic, updatePedestrians, updateTrafficLights } from './aiTraffic';
import { 
  updateBreakablePropsAndLivingWorld,
  updatePlayerPedestrianPhysics, 
  updateSkidMarksAndParticles, 
  updateVehiclePhysics 
} from './physics';
import { GameRenderer } from './renderer';
import { sound } from './audio';
import { TrafficConsole } from './components/TrafficConsole';
import { 
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cloud,
  CloudLightning,
  CloudRain,
  Compass, 
  Eye, 
  Gauge, 
  Moon, 
  RotateCcw,
  Sun, 
  Sunrise, 
  Terminal,
  Volume2, 
  VolumeX, 
  Zap 
} from 'lucide-react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Status
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isInVehicle, setIsInVehicle] = useState<boolean>(false);
  const [activeCarName, setActiveCarName] = useState<string>('');
  const [gear, setGear] = useState<'P' | 'D' | 'R'>('P');
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
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

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

  const worldRef = useRef<GameWorld | null>(null);
  const playerRef = useRef<Player>({
    x: 520,
    y: 530,
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
    x: 520,
    y: 530,
    angle: 0,
    targetAngle: 0,
    zoom: 1.15,
    targetZoom: 1.15,
    targetX: 520,
    targetY: 530,
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

  // Turn signal audio tick timer
  const turnTickTimerRef = useRef<number>(0);

  // Initialize Game World (Runs ONCE on mount, NEVER resets when toggling day/night)
  useEffect(() => {
    sound.init();
    const world = generateCityWorld();
    worldRef.current = world;

    // Index static buildings into spatial grid
    const bldGrid = spatialGridBuildingsRef.current;
    bldGrid.clear();
    world.buildings.forEach((b) => bldGrid.insert(b));

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

      // Turn Signals
      if (code === 'KeyQ') {
        toggleTurnSignal('left');
      }
      if (code === 'KeyZ') {
        toggleTurnSignal('right');
      }
      if (code === 'KeyX') {
        toggleTurnSignal('hazard');
      }

      // Enter/Exit Vehicle
      if (code === 'KeyE') {
        handleEnterExitVehicle();
      }

      // AI Telemetry Console toggle
      if (code === 'Backquote' || code === 'F1') {
        setIsConsoleOpen((prev) => !prev);
        e.preventDefault();
      }
      if (code === 'Escape') {
        setIsConsoleOpen(false);
      }

      // Time toggle (cycle presets)
      if (code === 'KeyT') {
        cycleTimePreset();
      }
      if (code === 'KeyC') {
        cameraRef.current.targetZoom = cameraRef.current.targetZoom < 1.0 ? 1.3 : 0.85;
      }
      if (code === 'KeyM') {
        setIsMinimapExpanded((prev) => !prev);
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
        player.angle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
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

        // 1. Update Traffic Lights
        updateTrafficLights(world.intersections, dt);

        // 2. Update AI Traffic
        updateAITraffic(world, dt);

        // 3. Update Pedestrians
        updatePedestrians(world, dt);

        // 4. Update Dynamic Spatial Grids
        const vehGrid = spatialGridVehiclesRef.current;
        vehGrid.clear();
        world.vehicles.forEach((v) => vehGrid.insert(v));

        const pedGrid = spatialGridPedestriansRef.current;
        pedGrid.clear();
        world.pedestrians.forEach((p) => pedGrid.insert(p));

        // 5. Update Player & Vehicles Physics
        const playerNearbyBuildings = spatialGridBuildingsRef.current.queryRadius(
          player.x,
          player.y,
          300
        );

        if (!player.isInVehicle) {
          updatePlayerPedestrianPhysics(player, input, playerNearbyBuildings, dt, camera.angle, world.width, world.height);
          camera.targetX = player.x;
          camera.targetY = player.y;
          // Only align camera target angle with pedestrian movement when actually walking
          if (Math.hypot(player.vx, player.vy) > 10) {
            camera.targetAngle = Math.atan2(player.vy, player.vx);
          }
          camera.targetZoom = 1.2 * userZoomFactorRef.current;
        }

        // Update all vehicles (both AI and player car)
        for (const veh of world.vehicles) {
          const vehNearbyBuildings = spatialGridBuildingsRef.current.queryRadius(
            veh.x,
            veh.y,
            250
          );
          const vehNearbyCars = spatialGridVehiclesRef.current.queryRadius(
            veh.x,
            veh.y,
            180
          );

          if (veh.isPlayerControlled) {
            veh.turnSignalTimer += dt;
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

            // HUD State Updates
            const currentSpeedKmh = Math.round(Math.abs(veh.speed) * 0.36);
            setSpeedKmh(currentSpeedKmh);
            setIsDrifting(veh.isDrifting);
            setPlayerTurnSignal(veh.turnSignal);
            if (veh.damage) {
              setCarHealth(Math.round(veh.damage.health));
              setDamageDetails({
                engineSmoking: !!veh.damage.engineSmoking,
                engineFire: !!veh.damage.engineFire,
                windshieldCracked: !!veh.damage.windshieldCracked,
                hoodBuckled: !!veh.damage.hoodBuckled,
                lightsBroken: !!(
                  veh.damage.leftHeadlightBroken || 
                  veh.damage.rightHeadlightBroken || 
                  veh.damage.leftTaillightBroken || 
                  veh.damage.rightTaillightBroken
                )
              });
            }

            if (veh.speed > 5) setGear('D');
            else if (veh.speed < -5) setGear('R');
            else setGear('P');
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
          for (const veh of world.vehicles) {
            const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
            if (dist < 75) {
              foundNearbyCar = veh;
              break;
            }
          }
          if (foundNearbyCar) {
            const cfg = CAR_CONFIGS[foundNearbyCar.type];
            setNearbyCarPrompt(`[E] Drive ${cfg.name}`);
          } else {
            setNearbyCarPrompt(null);
          }
        } else {
          setNearbyCarPrompt('[E] Exit Vehicle');
        }

        // 6. Update Skid marks, Particles & Breakables / Living World
        world.weather = weatherRef.current;
        updateSkidMarksAndParticles(world, dt);
        updateBreakablePropsAndLivingWorld(world, player, dt);

        // 7. Smooth Camera Lerp
        camera.x += (camera.targetX - camera.x) * 6 * dt;
        camera.y += (camera.targetY - camera.y) * 6 * dt;
        camera.zoom += (camera.targetZoom - camera.zoom) * 4 * dt;

        // Smooth camera rotation lerp with slight lag/delay
        let angleDiff = (camera.targetAngle - camera.angle) % (Math.PI * 2);
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        const rotSpeed = player.isInVehicle ? 3.0 : 1.5;
        camera.angle += angleDiff * Math.min(1.0, rotSpeed * dt);

        // 8. Query objects in Camera Viewport for rendering (using diagonal margin for rotated view)
        const vpMargin = Math.hypot(window.innerWidth, window.innerHeight) / (2 * Math.max(0.4, camera.zoom)) + 150;
        const vpBuildings = spatialGridBuildingsRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpVehicles = spatialGridVehiclesRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );
        const vpPedestrians = spatialGridPedestriansRef.current.queryRect(
          camera.x - vpMargin,
          camera.y - vpMargin,
          vpMargin * 2,
          vpMargin * 2
        );

        // 9. Render Scene
        if (isTimeAutoCyclingRef.current) {
          timeHourRef.current = (timeHourRef.current + dt * 0.12) % 24;
          setTimeHour(timeHourRef.current);
        }

        if (weatherTransitionRef.current < 1.0) {
          weatherTransitionRef.current = Math.min(1.0, weatherTransitionRef.current + dt * 0.5);
          setWeatherTransition(weatherTransitionRef.current);
        }

        rendererRef.current.render(
          world,
          player,
          camera,
          timeHourRef.current,
          weatherTransitionRef.current,
          vpBuildings,
          vpVehicles,
          vpPedestrians
        );

        // 10. Render Minimap
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

      // Traffic Lights
      for (const inter of world.intersections) {
        const phase = inter.phases[inter.currentPhaseIndex];
        ctx.fillStyle = phase.nsState === 'green' ? '#22c55e' : '#ef4444';
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

      // Intersections & Lights
      for (const inter of world.intersections) {
        const phase = inter.phases[inter.currentPhaseIndex];
        ctx.fillStyle = phase.nsState === 'green' ? '#22c55e' : '#ef4444';
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
        </div>

        {/* Quick Mode Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="time-toggle-btn"
            onClick={cycleTimePreset}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 shadow-lg transition-all"
            title="Cycle Time of Day / Auto-Cycle (T)"
          >
            {getTimeLabelName(timeHour) === 'Morning' && <Sunrise className="w-3.5 h-3.5 text-amber-400" />}
            {getTimeLabelName(timeHour) === 'Day' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
            {getTimeLabelName(timeHour) === 'Sunset' && <Sunrise className="w-3.5 h-3.5 text-orange-400" />}
            {getTimeLabelName(timeHour) === 'Night' && <Moon className="w-3.5 h-3.5 text-sky-300" />}
            <span className="capitalize">{getTimeLabelName(timeHour)} ({Math.floor(timeHour)}:00)</span>
            {!isTimeAutoCycling && <span className="text-[9px] text-amber-400 font-bold ml-0.5">⏸</span>}
          </button>

          <button
            id="weather-toggle-btn"
            onClick={cycleWeather}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 shadow-lg transition-all"
            title="Cycle Weather Effects"
          >
            {weather === 'clear' && <Sun className="w-3.5 h-3.5 text-amber-300" />}
            {weather === 'rain' && <CloudRain className="w-3.5 h-3.5 text-blue-400 animate-bounce" />}
            {weather === 'fog' && <Cloud className="w-3.5 h-3.5 text-slate-300" />}
            {weather === 'storm' && <CloudLightning className="w-3.5 h-3.5 text-purple-400 animate-pulse" />}
            <span className="capitalize">{weather}</span>
          </button>

          <button
            id="sound-toggle-btn"
            onClick={toggleSoundMute}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 shadow-lg transition-all"
            title="Toggle Sound Effects"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Audio ON'}</span>
          </button>

          <button
            id="camera-zoom-btn"
            onClick={() => {
              cameraRef.current.targetZoom = cameraRef.current.targetZoom < 1.0 ? 1.3 : 0.85;
            }}
            className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 shadow-lg transition-all"
            title="Toggle Camera Zoom (C)"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zoom</span>
          </button>

          <button
            id="open-ai-console-btn"
            onClick={() => setIsConsoleOpen(true)}
            className="bg-indigo-950/90 hover:bg-indigo-900 border border-indigo-500/40 rounded-lg px-3 py-1.5 text-xs text-indigo-200 flex items-center gap-1.5 shadow-lg transition-all"
            title="Open Traffic AI Diagnostics & Console (~ / F1)"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Console [~]</span>
          </button>
        </div>
      </div>

      {/* TOP-RIGHT: RADAR MINIMAP */}
      <div id="hud-top-right" className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-2 shadow-2xl overflow-hidden relative">
          <canvas
            id="minimap-canvas"
            ref={minimapCanvasRef}
            width={isMinimapExpanded ? 240 : 140}
            height={isMinimapExpanded ? 240 : 140}
            className="rounded-xl block"
          />
          <button
            id="minimap-toggle-btn"
            onClick={() => setIsMinimapExpanded((prev) => !prev)}
            className="absolute bottom-3 right-3 bg-slate-950/80 hover:bg-slate-800 border border-slate-700 text-[10px] text-slate-300 px-2 py-0.5 rounded-md shadow"
          >
            {isMinimapExpanded ? 'Radar' : 'Full Map'} [M]
          </button>
        </div>
      </div>

      {/* CENTER-BOTTOM: FLOATING INTERACTION PROMPT */}
      {nearbyCarPrompt && (
        <div id="interaction-prompt" className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-sky-500/90 border border-sky-300 text-white font-semibold px-5 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-bounce text-sm">
            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
            <span>{nearbyCarPrompt}</span>
          </div>
        </div>
      )}

      {/* BOTTOM-RIGHT: VEHICLE DASHBOARD & TURN SIGNALS (WHEN DRIVING) */}
      {isInVehicle && (
        <div id="speedometer-container" className="absolute bottom-4 right-4 z-20 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl text-white flex flex-col gap-3 min-w-[240px]">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <Gauge className="w-20 h-20 text-slate-700" />
                {/* Radial speed indicator */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black tracking-tighter text-sky-400">{speedKmh}</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">KM/H</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 flex-1">
                <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{activeCarName}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Gear:</span>
                  <span className={`font-black px-1.5 py-0.5 rounded ${gear === 'D' ? 'bg-emerald-500/20 text-emerald-400' : gear === 'R' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'}`}>
                    {gear}
                  </span>
                </div>
                {isDrifting && (
                  <div className="text-[11px] font-bold text-amber-400 animate-pulse tracking-wide">
                    DRIFT 💨
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Damage / Structural Health State */}
            <div className="flex flex-col gap-1.5 px-1 py-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">🔧 Condition:</span>
                <span className={`font-bold ${carHealth > 65 ? 'text-emerald-400' : carHealth > 30 ? 'text-amber-400' : 'text-rose-500 animate-pulse'}`}>
                  {carHealth}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
                <div 
                  className={`h-full transition-all duration-300 ${carHealth > 65 ? 'bg-emerald-500' : carHealth > 30 ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`}
                  style={{ width: `${carHealth}%` }}
                />
              </div>

              {/* Active Damage Alerts list */}
              {(damageDetails.engineSmoking || damageDetails.engineFire || damageDetails.windshieldCracked || damageDetails.hoodBuckled || damageDetails.lightsBroken) && (
                <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-bold uppercase tracking-wider">
                  {damageDetails.engineFire && (
                    <span className="bg-rose-950/80 text-rose-400 border border-rose-500/30 px-1.5 py-0.5 rounded animate-pulse">🔥 Engine Fire</span>
                  )}
                  {damageDetails.engineSmoking && !damageDetails.engineFire && (
                    <span className="bg-slate-800 text-slate-300 border border-slate-600 px-1.5 py-0.5 rounded">💨 Engine Smoke</span>
                  )}
                  {damageDetails.windshieldCracked && (
                    <span className="bg-sky-950/80 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded">🕸️ Glass Cracked</span>
                  )}
                  {damageDetails.hoodBuckled && (
                    <span className="bg-amber-950/80 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">💥 Hood Buckled</span>
                  )}
                  {damageDetails.lightsBroken && (
                    <span className="bg-stone-800 text-stone-300 border border-stone-600 px-1.5 py-0.5 rounded">💡 Broken Lights</span>
                  )}
                </div>
              )}

              {/* Repair Option */}
              <div className="flex justify-end mt-1">
                <button
                  id="btn-repair-car"
                  onClick={handleResetVehicle}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-[10px] font-bold text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                  title="Repair & Reset Vehicle (R)"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>Repair Car [R]</span>
                </button>
              </div>
            </div>

            {/* Headlights Mode Indicator & Control (Ближний / Дальний / Выкл) */}
            <div className="flex items-center justify-between px-1 py-1 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Headlights:</span>
              <button
                id="btn-headlights-toggle"
                onClick={toggleHeadlights}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  playerHeadlightMode === 'high'
                    ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-sm shadow-blue-500/20'
                    : playerHeadlightMode === 'low'
                    ? 'bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Toggle Headlights: Low / High / Off (L)"
              >
                <span>
                  {playerHeadlightMode === 'high'
                    ? '🔵 Дальний [L]'
                    : playerHeadlightMode === 'low'
                    ? '🟢 Ближний [L]'
                    : '⚪ Выкл [L]'}
                </span>
              </button>
            </div>

            {/* Turn Signals Controls & Blinking Dashboard Status */}
            <div className="flex items-center justify-between pt-1">
              <button
                id="btn-signal-left"
                onClick={() => toggleTurnSignal('left')}
                className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                  playerTurnSignal === 'left' || playerTurnSignal === 'hazard'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Left Turn Signal (Q)"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Q</span>
              </button>

              <button
                id="btn-signal-hazard"
                onClick={() => toggleTurnSignal('hazard')}
                className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                  playerTurnSignal === 'hazard'
                    ? 'bg-rose-500/30 border-rose-400 text-rose-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Hazard Warning Lights (X)"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>X</span>
              </button>

              <button
                id="btn-signal-right"
                onClick={() => toggleTurnSignal('right')}
                className={`p-2 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
                  playerTurnSignal === 'right' || playerTurnSignal === 'hazard'
                    ? 'bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Right Turn Signal (Z)"
              >
                <span>Z</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: CONTROLS & SHORTCUTS GUIDE */}
      <div id="hud-bottom-left" className="absolute bottom-4 left-4 z-20 pointer-events-none hidden sm:block">
        <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-xl px-4 py-3 shadow-xl text-slate-300 text-xs flex flex-col gap-1.5">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>🎮 Controls</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">WASD / ↑←↓→</kbd> Realistic Steering</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">E</kbd> Enter / Exit Car</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">Q / Z</kbd> Turn Signals (L / R)</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">X</kbd> Hazard Lights</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">SPACE</kbd> Handbrake / Drift</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">H</kbd> Car Horn</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">L</kbd> Lights (Low/High/Off)</div>
            <div><kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-sky-400 font-mono">T</kbd> Day / Night Cycle</div>
          </div>
        </div>
      </div>

      {/* ON-SCREEN MOBILE / TOUCH BUTTONS */}
      <div id="touch-controls" className="absolute bottom-6 left-6 z-30 flex sm:hidden flex-col gap-2">
        <div className="flex gap-2">
          <button
            onTouchStart={() => (inputRef.current.left = true)}
            onTouchEnd={() => (inputRef.current.left = false)}
            className="w-12 h-12 bg-slate-800/90 text-white rounded-xl active:bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg border border-slate-700"
          >
            ←
          </button>
          <div className="flex flex-col gap-2">
            <button
              onTouchStart={() => (inputRef.current.forward = true)}
              onTouchEnd={() => (inputRef.current.forward = false)}
              className="w-12 h-12 bg-slate-800/90 text-white rounded-xl active:bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg border border-slate-700"
            >
              ↑
            </button>
            <button
              onTouchStart={() => (inputRef.current.backward = true)}
              onTouchEnd={() => (inputRef.current.backward = false)}
              className="w-12 h-12 bg-slate-800/90 text-white rounded-xl active:bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg border border-slate-700"
            >
              ↓
            </button>
          </div>
          <button
            onTouchStart={() => (inputRef.current.right = true)}
            onTouchEnd={() => (inputRef.current.right = false)}
            className="w-12 h-12 bg-slate-800/90 text-white rounded-xl active:bg-sky-600 flex items-center justify-center font-bold text-lg shadow-lg border border-slate-700"
          >
            →
          </button>
        </div>
      </div>

      <div id="touch-action-buttons" className="absolute bottom-6 right-6 z-30 flex sm:hidden gap-2">
        <button
          onClick={handleEnterExitVehicle}
          className="w-14 h-14 bg-sky-600 text-white rounded-2xl active:bg-sky-700 flex items-center justify-center font-bold shadow-xl border border-sky-400"
        >
          [E]
        </button>
        <button
          onTouchStart={() => (inputRef.current.handbrake = true)}
          onTouchEnd={() => (inputRef.current.handbrake = false)}
          className="w-14 h-14 bg-rose-600 text-white rounded-2xl active:bg-rose-700 flex items-center justify-center font-bold shadow-xl border border-rose-400"
        >
          DRIFT
        </button>
      </div>

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
    </div>
  );
}

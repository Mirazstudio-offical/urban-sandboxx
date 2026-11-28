import { isPtoOn, togglePto, vehicleHasPto } from './ptoSystem';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setDisplaySettings } from './displaySettings';
import { matchesKeybind, getKeybindLabel } from './keybinds';
import { 
  Building, 
  Camera, 
  GameWorld, 
  GroundItem,
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
  ActivePlacement,
  FuelType,
  GasPumpDispenser,
  CarType,
  RollingStockCar,
  MapShopCatalogEntry
} from './types';
import { 
  advanceCalendar, 
  createInitialCalendarState, 
  formatGameDate, 
  formatGameTime, 
  pickRandomSeasonalWeather, 
  calculateClimateAtmosphere,
  getRussianSeasonName,
  getInitialSurfaceHydrologyForCalendar,
  GameCalendarState
} from './calendarSystem';
import { getEffectiveWeatherWeights, updateSurfaceHydrologyAndSnow, ensureWorldSurfaceHydrology } from './weatherTransition';
import { 
  CAR_CONFIGS, 
  createDefaultEngineState, 
  createDefaultFuelSystem, 
  createDefaultVehicleDamage, 
  ensureVehicleDamage, 
  getVehicleFuelCapPosition, 
  getVehicleWaterHoseAnchor,
  isTrailerVehicle, 
  isRoadMachinery,
  PX_S_TO_SPEED_KMH, 
  hasRoadTrainLights, 
  toggleAxleDiffLock, 
  cycleVehicleDiffLock, 
  getVehicleDiffCapabilities,
  getVehicleTurnSignalDynamicState,
  getVehicleTurnSignalConfig
} from './vehicleHelpers';
import { applyPowertrain, describePowertrain, buildPowertrainPick, pickPowertrain, getPowertrainPickByIds, makePowertrainRng } from './powertrainVariants';
import { loadMap, sanitizeWorldVehicles } from './loadMap';
import { SpatialGrid } from './spatialGrid';
import { updateAITraffic, updatePedestrians, updateTrafficLights } from './aiTraffic';
import { geminiTrafficController } from './geminiTrafficDecisions';
import { RailwaySignalingSystem } from './railwaySignalingSystem';
import { TrainSystem } from './trainSystem';
import { updateCameraPoles } from './cameraPoleSystem';
import { triggerPlayerActionAnim } from './humanAnimationSystem';
import { 
  getAllBuildingEntrances,
  updateBreakablePropsAndLivingWorld,
  updatePlayerNeedsAndVitals,
  updatePlayerPedestrianPhysics, 
  updateSkidMarksAndParticles, 
  updateVehiclePhysics,
  toggleTrailerHitch,
  hitchTrailerToVehicle,
  unhitchTrailerFromVehicle,
  getOutsideTemperature,
  updateWorldWind,
  getRoadsNearPoint,
  setManualAutoShiftPref
} from './physics';
import { GameRenderer } from './renderer';
import { getBuildingFloorsCount, getBuildingLayout, constrainPlayerToInterior, clearInteriorCanvasCache, getApartmentDoorSegment } from './buildingInteriors';
import { sitPlayerOnSeat, standPlayerUp } from './busInteriorSystem';
import { calculateGpsRoute } from './navigation';
import { sound } from './audio';
import { TaxiFleetSystem } from './taxiSystem';
import { 
  addItemToPlayer,
  addPlayerNotification,
  cancelConsumption,
  createDefaultPlayerInventory, 
  createItem,
  createItemFromShopEntry,
  packagePurchasedShopItems,
  deductPlayerCash,
  getPlayerCash,
  pickupGroundItem, 
  pickupNearbyLitter,
  isPlayerNearTrashBin,
  seedInitialGroundItems, 
  updateConsumption,
  useItemOnPlayer,
  useHandItemOnPlayer,
  stowItemFromHandToPockets,
  swapPlayerHands,
  ITEM_CATALOG,
  addPlayerCash,
  getVehicleRequiredKeyType,
  takeOutKeyFromVehicle,
  insertKeyToVehicle,
  playerHasKeyForVehicle
} from './items';
import { defaultBodyState } from './sensations';
import {
  DEFAULT_PHONE_NOTES,
  getActiveWorldPhoneNotes,
  loadSavesFromStorage,
  resetActiveWorldPhoneNotes,
  saveSavesToStorage,
  setActiveWorldPhoneNotes
} from './saveStorage';
import { Minimap } from './components/Minimap';
import { LandscapeGuard } from './components/LandscapeGuard';
import { MobileTouchControls } from './components/MobileTouchControls';
import { TruckSuperstructureHUD } from './components/TruckSuperstructureHUD';
import { ExcavatorHUD } from './components/ExcavatorHUD';
import { isVehicleCraneTruck, getVehicleCraneGeometry } from './truckChassisVariants';
import { getExcavatorGeometry, isExcavatorVehicle } from './excavatorSystem';
import { toggleCraneHookAttach } from './physics';
import { MainMenu } from './components/MainMenu';
import { GameLoadingScreen, type LoadingScreenState } from './components/GameLoadingScreen';
import { VehicleBoardMenu } from './components/VehicleBoardMenu';
import { TimeScaleButton, SlowMotionIndicator, DEFAULT_SLOW_SCALE } from './components/TimeScaleControl';
import { PauseMenu, type PauseSessionInfo } from './components/PauseMenu';
import { getVehicleCatalogItem } from './vehicleCatalog';
import { PlayerNeedsHUD } from './components/PlayerNeedsHUD';
import { RadialMenu } from './components/RadialMenu';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { performanceConfig, capNearest, isMobileOrLowEndDevice } from './performanceConfig';
import { crashLogger, CrashReport } from './crashLogger';
import { CrashAlertToast } from './components/CrashAlertToast';
import { findPointedInteraction, canUseActiveHandItem, InteractionTarget } from './interactionSystem';
import { WorldInviteToast } from './components/WorldInviteToast';
import { BedSleepOverlay } from './components/BedSleepOverlay';

// Lazy-loaded on-demand modals for faster initial load (code-splitting)
const TrafficConsole = React.lazy(() => import('./components/TrafficConsole').then((m) => ({ default: m.TrafficConsole })));
const FullScreenMap = React.lazy(() => import('./components/FullScreenMap').then((m) => ({ default: m.FullScreenMap })));
const CraneOutriggersModal = React.lazy(() => import('./components/CraneOutriggersModal').then((m) => ({ default: m.CraneOutriggersModal })));
const VacuumPumpModal = React.lazy(() => import('./components/VacuumPumpModal').then((m) => ({ default: m.VacuumPumpModal })));
const PerformanceTest = React.lazy(() => import('./components/PerformanceTest').then((m) => ({ default: m.PerformanceTest })));
const CollisionTest = React.lazy(() => import('./components/CollisionTest').then((m) => ({ default: m.CollisionTest })));
const InventoryModal = React.lazy(() => import('./components/InventoryModal').then((m) => ({ default: m.InventoryModal })));
const SelfInspectionModal = React.lazy(() => import('./components/SelfInspectionModal').then((m) => ({ default: m.SelfInspectionModal })));
const LimbTreatmentModal = React.lazy(() => import('./components/LimbTreatmentModal').then((m) => ({ default: m.LimbTreatmentModal })));
import type { CityShop } from './components/ShopModal';
const ShopModal = React.lazy(() => import('./components/ShopModal').then((m) => ({ default: m.ShopModal })));
const CarDealershipModal = React.lazy(() => import('./components/CarDealershipModal').then((m) => ({ default: m.CarDealershipModal })));
const PerformanceProfiler = React.lazy(() => import('./components/PerformanceProfiler').then((m) => ({ default: m.PerformanceProfiler })));
const PhoneModal = React.lazy(() => import('./components/PhoneModal').then((m) => ({ default: m.PhoneModal })));
const CrashDiagnosticsModal = React.lazy(() => import('./components/CrashDiagnosticsModal').then((m) => ({ default: m.CrashDiagnosticsModal })));
const FuelNozzleSelectorModal = React.lazy(() => import('./components/FuelNozzleSelectorModal').then((m) => ({ default: m.FuelNozzleSelectorModal })));
const GasStationCashierModal = React.lazy(() => import('./components/GasStationCashierModal').then((m) => ({ default: m.GasStationCashierModal })));
const EngineBayModal = React.lazy(() => import('./components/EngineBayModal').then((m) => ({ default: m.EngineBayModal })));
const OnlineModal = React.lazy(() => import('./components/OnlineModal').then((m) => ({ default: m.OnlineModal })));
const UserProfileModal = React.lazy(() => import('./components/UserProfileModal').then((m) => ({ default: m.UserProfileModal })));
const FriendsModal = React.lazy(() => import('./components/FriendsModal').then((m) => ({ default: m.FriendsModal })));
const RealEstateAgencyModal = React.lazy(() => import('./components/RealEstateAgencyModal').then((m) => ({ default: m.RealEstateAgencyModal })));
const PropertyDocumentModal = React.lazy(() => import('./components/PropertyDocumentModal').then((m) => ({ default: m.PropertyDocumentModal })));
const FurnitureStorageModal = React.lazy(() => import('./components/FurnitureStorageModal').then((m) => ({ default: m.FurnitureStorageModal })));
const KitchenTableModal = React.lazy(() => import('./components/KitchenTableModal').then((m) => ({ default: m.KitchenTableModal })));
const KitchenStoveModal = React.lazy(() => import('./components/KitchenStoveModal').then((m) => ({ default: m.KitchenStoveModal })));
const KitchenSinkModal = React.lazy(() => import('./components/KitchenSinkModal').then((m) => ({ default: m.KitchenSinkModal })));
const BathtubModal = React.lazy(() => import('./components/BathtubModal').then((m) => ({ default: m.BathtubModal })));
const WashingMachineModal = React.lazy(() => import('./components/WashingMachineModal').then((m) => ({ default: m.WashingMachineModal })));
const MicrowaveModal = React.lazy(() => import('./components/MicrowaveModal').then((m) => ({ default: m.MicrowaveModal })));
const WaterCoolerModal = React.lazy(() => import('./components/WaterCoolerModal').then((m) => ({ default: m.WaterCoolerModal })));
const DateTimePickerModal = React.lazy(() => import('./components/DateTimePickerModal').then((m) => ({ default: m.DateTimePickerModal })));
const CreativeMenuModal = React.lazy(() => import('./components/CreativeMenuModal').then((m) => ({ default: m.CreativeMenuModal })));
const CreativePlacementHud = React.lazy(() => import('./components/CreativeMenuModal').then((m) => ({ default: m.CreativePlacementHud })));
import { 
  BedSleepState, 
  startLyingOnBed, 
  triggerFallingAsleep, 
  standUpFromBed, 
  updateBedSleepCycle, 
  finishSleep 
} from './bedSleepSystem';
import { toggleApartmentLock, getApartmentById, getCityApartments, resetCityApartmentsForWorld } from './propertySystem';
import { 
  buildFurnitureStorageId, 
  getExistingFurnitureStorage, 
  deleteFurnitureStorage,
  getFurnitureStorage,
  exportFurnitureStorageData,
  importFurnitureStorageData,
  resetFurnitureStorages,
  saveFurnitureStoragesToLocalStorage
} from './furnitureStorageSystem';
import { ChatOverlay } from './components/ChatOverlay';
import { ServerAuthModal } from './components/ServerAuthModal';
import { onlineManager, OnlineStatus, type AntiCheatLevel, type ServerPlayerSaveRecord } from './onlineSystem';
import { closeHostSession, openHostSession, getHostSession, type HostAccess } from './hostSession';
import {
  auth,
  onAuthStateChanged,
  ensureUserProfileExists,
  updateUserOnlineStatus,
  saveHostedServerBackup,
  type HostedServerBackup,
  type User
} from './firebase';
import { 
  getNearbyGasPump, 
  getNearbyVehicleForFueling, 
  takePumpNozzle, 
  insertNozzleIntoVehicle, 
  removeNozzleFromVehicle, 
  returnNozzleToPump, 
  startGasPumpFueling, 
  updateGasPumps, 
  isPlayerNearGasStationCashier, 
  FUEL_GRADES 
} from './gasStationSystem';
import { 
  getNearbyWaterVehicle, 
  takeWaterHose, 
  stowWaterHose, 
  updateWaterHosePhysics 
} from './waterHoseSystem';
import { getActivePostFxWaterWakes, getRiverWaterAt } from './riverSystem';
import { 
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Cloud,
  CloudDrizzle,
  CloudSun,
  CloudLightning,
  CloudRain,
  Snowflake,
  Wind,
  Compass, 
  Eye, 
  Flame,
  Fuel,
  Grid,
  Heart,
  HeartPulse,
  TreePine,
  Home,
  Building2,
  Truck,
  Map,
  Maximize2,
  Minimize2,
  Moon, 
  Mountain,
  Navigation,
  Pill,
  RotateCcw,
  Settings,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Sliders,
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
  ZoomIn,
  ZoomOut,
  MapPin,
  Sparkles,
  Plane,
  ShieldAlert,
  Trash2,
  Coins,
  Wand2,
  RotateCw,
  Search,
  Radio,
  Users,
  Globe,
  MessageSquare,
  Train,
  Pause,
  Menu as MenuIcon
} from 'lucide-react';

import { SPAWN_LOCATIONS, getAllSpawnLocations, type SpawnLocation } from './spawnLocations';
import { GpuPostFx } from './gpu/postFx';
export { SPAWN_LOCATIONS, getAllSpawnLocations, type SpawnLocation };


function findStreetNameAtPosition(world: GameWorld | null, px: number, py: number): string {
  if (!world || !world.roads) return 'Grand Boulevard';
  const candidateRoads = getRoadsNearPoint(world, px, py);
  for (let i = 0; i < candidateRoads.length; i++) {
    const road = candidateRoads[i];
    const halfW = road.width / 2 + 25;
    const rMinX = road._minX ?? Math.min(road.x1, road.x2);
    const rMaxX = road._maxX ?? Math.max(road.x1, road.x2);
    const rMinY = road._minY ?? Math.min(road.y1, road.y2);
    const rMaxY = road._maxY ?? Math.max(road.y1, road.y2);
    if (px < rMinX - halfW || px > rMaxX + halfW || py < rMinY - halfW || py > rMaxY + halfW) {
      continue;
    }
    if (road.curvePoints && road.curvePoints.length > 1) {
      for (let j = 0; j < road.curvePoints.length - 1; j++) {
        const p1 = road.curvePoints[j];
        const p2 = road.curvePoints[j + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const l2 = dx * dx + dy * dy;
        let dist = 99999;
        if (l2 === 0) {
          dist = Math.hypot(px - p1.x, py - p1.y);
        } else {
          const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / l2));
          dist = Math.hypot(px - (p1.x + t * dx), py - (p1.y + t * dy));
        }
        if (dist <= halfW) {
          return road.name;
        }
      }
    } else {
      const dx = road.x2 - road.x1;
      const dy = road.y2 - road.y1;
      const l2 = dx * dx + dy * dy;
      let dist = 99999;
      if (l2 === 0) {
        dist = Math.hypot(px - road.x1, py - road.y1);
      } else {
        const t = Math.max(0, Math.min(1, ((px - road.x1) * dx + (py - road.y1) * dy) / l2));
        dist = Math.hypot(px - (road.x1 + t * dx), py - (road.y1 + t * dy));
      }
      if (dist <= halfW) {
        return road.name;
      }
    }
  }
  return 'Grand Boulevard';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gpuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const gpuFxRef = useRef<GpuPostFx | null>(null);
  const minimapFrameMsRef = useRef<number>(0);

  // React State for HUD & Status
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  // Bumped on every throttled HUD update so the instrument cluster re-reads mutable
  // engine data (RPM, coolant, oil, fuel) even when speed and gear are unchanged.
  const [hudTick, setHudTick] = useState<number>(0);
  const [isInVehicle, setIsInVehicle] = useState<boolean>(false);
  const [activeCarName, setActiveCarName] = useState<string>('');
  const [gear, setGear] = useState<'P'| 'D'| 'R'| 'N'| string>('D');
  const [isMobileTouch, setIsMobileTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart'in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
  });
  const [touchUiScale, setTouchUiScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.75;
    const saved = localStorage.getItem('urban_sandbox_ui_scale');
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 1.2) return parsed;
    }
    return 0.75; // Default calibrated compact 75%
  });

  const handleCycleTouchScale = useCallback(() => {
    setTouchUiScale((prev) => {
      let next = 0.75;
      if (prev <= 0.68) next = 0.75;
      else if (prev <= 0.78) next = 0.85;
      else if (prev <= 0.9) next = 1.0;
      else next = 0.65;
      try {
        localStorage.setItem('urban_sandbox_ui_scale', next.toString());
      } catch {}
      return next;
    });
  }, []);
  const [timeScale, setTimeScale] = useState<number>(1.0);
  const timeScaleRef = useRef<number>(1.0);
  timeScaleRef.current = timeScale;
  const smoothTimeScaleRef = useRef<number>(1.0);
  const lastSlowScaleRef = useRef<number>(DEFAULT_SLOW_SCALE);
  if (timeScale < 1.0) lastSlowScaleRef.current = timeScale;
  const toggleSlowMotion = () => setTimeScale((prev) => (prev < 1.0 ? 1.0 : lastSlowScaleRef.current));
  const [calendar, setCalendar] = useState<GameCalendarState>(() => createInitialCalendarState(2026, 10, 8, 10.0));
  const [timeHour, setTimeHour] = useState<number>(10.0); // 0 to 24 hours
  const [isTimeAutoCycling, setIsTimeAutoCycling] = useState<boolean>(true);
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [weatherTransition, setWeatherTransition] = useState<number>(1.0);
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState<boolean>(false);
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
  const [playerTurnSignal, setPlayerTurnSignal] = useState<'none'| 'left'| 'right'| 'hazard'>('none');
  const [canEnterBuilding, setCanEnterBuilding] = useState<Building | null>(null);
  const [canExitBuilding, setCanExitBuilding] = useState<boolean>(false);
  const [activeElevatorMenu, setActiveElevatorMenu] = useState<{
    bldId: string;
    bldName: string;
    currentFloor: number;
    maxFloors: number;
    type: 'elevator'| 'stairs';
  } | null>(null);
  const [fadeActive, setFadeActive] = useState<boolean>(false);
  const [playerHeadlightMode, setPlayerHeadlightMode] = useState<'off'| 'low'| 'high'>('low');
  const [fps, setFps] = useState<number>(60);
  const [streetName, setStreetName] = useState<string>('Grand Boulevard');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Gas Station System States
  const [isFuelNozzleModalOpen, setIsFuelNozzleModalOpen] = useState<boolean>(false);
  const [activeGasPump, setActiveGasPump] = useState<GasPumpDispenser | null>(null);
  const [isGasStationCashierModalOpen, setIsGasStationCashierModalOpen] = useState<boolean>(false);
  const [isEngineBayOpen, setIsEngineBayOpen] = useState<boolean>(false);
  const [engineBayVehicle, setEngineBayVehicle] = useState<Vehicle | null>(null);
  const [isCraneOutriggersModalOpen, setIsCraneOutriggersModalOpen] = useState<boolean>(false);
  const [craneOutriggersVehicle, setCraneOutriggersVehicle] = useState<Vehicle | null>(null);
  const [isVacuumPumpModalOpen, setIsVacuumPumpModalOpen] = useState<boolean>(false);
  const [vacuumPumpVehicle, setVacuumPumpVehicle] = useState<Vehicle | null>(null);
  const [gasStationPrompt, setGasStationPrompt] = useState<string | null>(null);
  const activeInteractionRef = useRef<InteractionTarget | null>(null);
  const [longTapVisual, setLongTapVisual] = useState<{ id: number; x: number; y: number } | null>(null);
  const longTapRef = useRef<{
    active: boolean;
    touchId: number;
    startX: number;
    startY: number;
    clientX: number;
    clientY: number;
    timerId: number | null;
  }>({ active: false, touchId: -1, startX: 0, startY: 0, clientX: 0, clientY: 0, timerId: null });
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [trafficCount, setTrafficCount] = useState<number>(0);
  const [pedCount, setPedCount] = useState<number>(0);

  const [isFullMapOpen, setIsFullMapOpen] = useState<boolean>(false);
  const isFullMapOpenRef = useRef<boolean>(false);
  isFullMapOpenRef.current = isFullMapOpen;
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const isOnlineModalOpenRef = useRef<boolean>(false);
  isOnlineModalOpenRef.current = isOnlineModalOpen;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState<boolean>(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState<boolean>(false);
  const [onlineStatus, setOnlineStatus] = useState<OnlineStatus>(onlineManager.status);
  const [isChatFocused, setIsChatFocused] = useState<boolean>(false);
  const isChatFocusedRef = useRef<boolean>(false);
  isChatFocusedRef.current = isChatFocused;

  // Real Estate & Apartment System States
  const [isRealEstateModalOpen, setIsRealEstateModalOpen] = useState<boolean>(false);
  const [isPropertyDocumentModalOpen, setIsPropertyDocumentModalOpen] = useState<boolean>(false);
  const [selectedPropertyDocItem, setSelectedPropertyDocItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (usr) => {
      setCurrentUser(usr);
      if (usr) {
        await ensureUserProfileExists(usr);
      }
    });
    return unsub;
  }, []);

  // Sync online status to Firestore
  useEffect(() => {
    if (!currentUser) return;

    const syncStatus = () => {
      const st = onlineManager.status === 'connected'? 'in_game': 'online';
      updateUserOnlineStatus(currentUser.uid, st, onlineManager.roomCode);
    };

    syncStatus();
    const interval = setInterval(syncStatus, 15000);

    const handleBeforeUnload = () => {
      updateUserOnlineStatus(currentUser.uid, 'offline', null);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser, onlineStatus]);

  const [onlinePlayerCount, setOnlinePlayerCount] = useState<number>(0);
  const onlineSyncTimerRef = useRef<number>(0);
  const pendingGuestServerSaveRef = useRef<{
    roomCode: string;
    serverWorldId: string;
    legacyWorldId: string;
  } | null>(null);

  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      setOnlineStatus(onlineManager.status);
      setOnlinePlayerCount(
        onlineManager.getRemotePlayersArray().length + (onlineManager.status === 'connected'? 1 : 0)
      );
    });
    return () => { unsub(); };
  }, []);

  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState<boolean>(false);
  const [isPerfTestOpen, setIsPerfTestOpen] = useState<boolean>(false);
  const [isCollisionTestOpen, setIsCollisionTestOpen] = useState<boolean>(false);
  const isPauseMenuOpenRef = useRef<boolean>(false);
  isPauseMenuOpenRef.current = isPauseMenuOpen;
  const [loadingScreen, setLoadingScreen] = useState<LoadingScreenState>({
    isOpen: false,
    actionType: 'new_career',
    title: '',
    stepText: '',
    progress: 0
  });
  const isLoadingRef = useRef<boolean>(false);
  isLoadingRef.current = loadingScreen.isOpen;
  // Which screen the main menu opens on (the pause menu can send the player straight to the server list)
  const [mainMenuInitialScreen, setMainMenuInitialScreen] = useState<'main' | 'servers'>('main');
  // Real session statistics shown on the pause screen (reset on new game / load)
  const sessionStatsRef = useRef<{ playMs: number; distPx: number; maxKmh: number; lastX: number | null; lastY: number | null; lastSaveAt: number | null }>(
    { playMs: 0, distPx: 0, maxKmh: 0, lastX: null, lastY: null, lastSaveAt: null }
  );
  useEffect(() => {
    if (!isMainMenuOpen) setMainMenuInitialScreen('main');
  }, [isMainMenuOpen]);
  const resetSessionStats = () => {
    sessionStatsRef.current = { playMs: 0, distPx: 0, maxKmh: 0, lastX: null, lastY: null, lastSaveAt: null };
  };

  const [settings, setSettings] = useState(() => {
    const base = {
      fpsLimit: 60,
      autoSaveInterval: 25,
      timeAutoCycle: true,
      mouseSensitivity: 1.0,
      shiftMode: 'manual' as 'auto' | 'manual',
      showSoftbodyMesh: false,
      smokeDensity: 100,
      useGeminiDecisionsTraffic: false,
      geminiTrafficIntervalMs: 500,
    };
    try {
      const raw = localStorage.getItem('city_sim_game_settings');
      if (raw) return { ...base, ...JSON.parse(raw) };
    } catch {}
    return base;
  });
  // Read by the game loop every frame (the loop is created once inside an effect)
  const fpsLimitRef = useRef<number>(settings.fpsLimit);
  fpsLimitRef.current = settings.fpsLimit;

  // Display toggles read by the renderer every frame (mesh overlay, smoke density)
  useEffect(() => {
    setDisplaySettings({ showSoftbodyMesh: !!settings.showSoftbodyMesh, smokeDensity: settings.smokeDensity ?? 100 });
  }, [settings.showSoftbodyMesh, settings.smokeDensity]);

  // Transmission preference for the sim (manual MT cars shift themselves in 'auto')
  useEffect(() => {
    setManualAutoShiftPref(settings.shiftMode);
  }, [settings.shiftMode]);

  // Experimental Gemini Decisions API traffic mode
  useEffect(() => {
    geminiTrafficController.configure({
      enabled: !!settings.useGeminiDecisionsTraffic,
      intervalMs: settings.geminiTrafficIntervalMs ?? 500,
    });
  }, [settings.useGeminiDecisionsTraffic, settings.geminiTrafficIntervalMs]);

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
  const [isVehicleBoardOpen, setIsVehicleBoardOpen] = useState<boolean>(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isInspectionOpen, setIsInspectionOpen] = useState<boolean>(false);
  const [isRadialMenuOpen, setIsRadialMenuOpen] = useState<boolean>(false);

  // Traffic city simulation master switch (AI cars + pedestrians freeze when OFF)
  const [isAiTrafficOn, setIsAiTrafficOn] = useState<boolean>(true);
  const aiTrafficOnRef = useRef<boolean>(true);
  const handleSetAiTraffic = (on: boolean) => {
    aiTrafficOnRef.current = on;
    setIsAiTrafficOn(on);
    const w = worldRef.current;
    if (w && !on && (w.gameMode === 'freeroam' || activeWorldRef.current.origin === 'server')) {
      // Freeroam or Dedicated Server: switching traffic off removes dynamic AI cars and pedestrians
      w.pedestrians = [];
      w.vehicles = w.vehicles.filter((v) =>
        v.isPlayerControlled || (v as any).isRemoteControlled || v.isParked || v.isDerelict ||
        (v as any).playerOwned || (v as any).isSpawnedByPlayer || v.ownerId === 'player' ||
        Boolean(v.keyId) || v.id === 'evac_ambulance_special'
      );
      setTrafficCount(w.vehicles.length);
    }
    if (onlineManager.status === 'connected' && onlineManager.isHost) {
      onlineManager.broadcastTrafficSettingsUpdate(
        on,
        performanceConfig.nearbyVehiclesTarget,
        performanceConfig.maxActivePedestrians
      );
    }
    const pl = playerRef.current;
    if (pl) {
      addPlayerNotification(pl, on ? 'Трафик города ВКЛЮЧЁН' : 'Трафик города ОСТАНОВЛЕН', on ? 'info' : 'warning');
    }
  };

  const handleUpdateTrafficCounts = (vehCount: number, pedCount: number) => {
    performanceConfig.nearbyVehiclesTarget = vehCount;
    performanceConfig.maxVehicles = Math.max(12, vehCount * 2);
    performanceConfig.maxActivePedestrians = pedCount;
    const w = worldRef.current;
    if (w) {
      if (w.pedestrians.length > pedCount) {
        w.pedestrians = w.pedestrians.slice(0, pedCount);
      }
      const observersCount = onlineManager.status === 'connected' && onlineManager.isHost
        ? Math.max(1, 1 + onlineManager.getRemotePlayersArray().length)
        : 1;
      const maxDynamic = Math.max(vehCount * observersCount, performanceConfig.maxVehicles);
      let dynamicSeen = 0;
      w.vehicles = w.vehicles.filter((v) => {
        const isPersistent =
          v.isPlayerControlled || (v as any).isRemoteControlled || v.isParked || v.isDerelict ||
          (v as any).playerOwned || (v as any).isSpawnedByPlayer || v.ownerId === 'player' ||
          Boolean(v.keyId) || v.id === 'evac_ambulance_special' || v.isTrailer;
        if (isPersistent) return true;
        dynamicSeen++;
        return dynamicSeen <= maxDynamic;
      });
      setTrafficCount(w.vehicles.length);
    }
    if (onlineManager.status === 'connected' && onlineManager.isHost) {
      onlineManager.broadcastTrafficSettingsUpdate(aiTrafficOnRef.current, vehCount, pedCount);
    }
  };

  // Default traffic state per game mode: career = always on (no toggle in the radial menu),
  // freeroam = off by default and switched on manually from the radial menu.
  const applyTrafficDefaultForMode = (mode: 'career' | 'freeroam') => {
    const on = mode !== 'freeroam';
    aiTrafficOnRef.current = on;
    setIsAiTrafficOn(on);
  };

  // Live vehicle configurator (color + powertrain) from the radial menu tree
  const handleApplyVehicleConfig = (cfg: {
    color?: { name: string; hex: string; roofHex?: string };
    powertrain?: { engineId?: string; transmissionId?: string; tuneId?: string; tireSetId?: string; turboKitId?: string; frameId?: string; bodyId?: string };
  }) => {
    const w = worldRef.current;
    const p = playerRef.current;
    if (!w || !p || !cfg) return;
    const veh = w.vehicles.find((v) => v.id === p.currentVehicleId);
    if (!veh) return;
    if (cfg.color) {
      veh.color = cfg.color.hex;
      if (cfg.color.roofHex) (veh as { roofColor?: string }).roofColor = cfg.color.roofHex;
    }
    if (cfg.powertrain) {
      const es = veh.engineState;
      const prevLength = veh.length;
      const sel = {
        engineId: cfg.powertrain.engineId ?? es?.engineId,
        transmissionId: cfg.powertrain.transmissionId ?? es?.transmissionId,
        tuneId: cfg.powertrain.tuneId ?? es?.tuneId,
        tireSetId: cfg.powertrain.tireSetId ?? es?.tireSetId,
        turboKitId: cfg.powertrain.turboKitId ?? es?.turboKitId ?? 'trb_none',
        frameId: cfg.powertrain.frameId ?? veh.frameId ?? es?.frameId,
        bodyId: cfg.powertrain.bodyId ?? veh.bodyId ?? es?.bodyId
      };
      applyPowertrain(veh, buildPowertrainPick(veh.type, sel));
      if (veh.length !== prevLength) {
        veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
      }
    }
  };
  const [treatmentModalItem, setTreatmentModalItem] = useState<{ index: number; item: InventoryItem } | null>(null);
  const [inventoryOpenContainerHand, setInventoryOpenContainerHand] = useState<'left' | 'right' | null>(null);
  const [activePhoneItem, setActivePhoneItem] = useState<InventoryItem | null>(null);
  const activePhoneItemRef = useRef<InventoryItem | null>(null);
  activePhoneItemRef.current = activePhoneItem;

  // Apartment Furniture Storage State
  const [furnitureStorageData, setFurnitureStorageData] = useState<{
    buildingId: string;
    floor: number;
    furnitureIndex: number;
    furnitureType: string;
    subSlot?: string;
    hasBuiltInSink?: boolean;
    aptId?: string;
    customTitle?: string;
  } | null>(null);
  const [isFurnitureStorageOpen, setIsFurnitureStorageOpen] = useState<boolean>(false);
  // The player inventory screen must never open on top of a furniture storage (no switching between them).
  const isFurnitureStorageOpenRef = useRef<boolean>(false);
  isFurnitureStorageOpenRef.current = isFurnitureStorageOpen;

  // Apartment Bed Sleeping & Relaxation State
  const [bedSleepState, setBedSleepState] = useState<BedSleepState | null>(null);
  const bedSleepStateRef = useRef<BedSleepState | null>(null);
  bedSleepStateRef.current = bedSleepState;
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isDealershipOpen, setIsDealershipOpen] = useState<boolean>(false);
  const [shopTitle, setShopTitle] = useState<string>('СУПЕРМАРКЕТ 24/7');
  const [shopType, setShopType] = useState<CityShop['type']>('supermarket');
  const [shopBuildingId, setShopBuildingId] = useState<string | null>(null);
  const [shopRoomName, setShopRoomName] = useState<string | null>(null);
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
  const isPerfConsoleOpenRef = useRef<boolean>(false);
  isPerfConsoleOpenRef.current = isPerfConsoleOpen;
  const [isCrashDiagnosticsOpen, setIsCrashDiagnosticsOpen] = useState<boolean>(false);
  const [crashToastReport, setCrashToastReport] = useState<CrashReport | null>(() => crashLogger.getPreviousCrashDetected());
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

  const [isGridMode, setIsGridMode] = useState<boolean>(false);

  const [isCleanMode, setIsCleanMode] = useState<boolean>(false);
  const isCleanModeRef = useRef<boolean>(false);
  isCleanModeRef.current = isCleanMode;

  const [activePlacement, setActivePlacement] = useState<ActivePlacement | null>(null);
  const activePlacementRef = useRef<ActivePlacement | null>(null);
  activePlacementRef.current = activePlacement;

  // Creative Sidebar UI states
  const [creativeTab, setCreativeTab] = useState<'vehicles'| 'props'| 'items'| 'cheats'>('vehicles');
  const [creativeItemSearch, setCreativeItemSearch] = useState<string>('');
  const [creativeVehicleColor, setCreativeVehicleColor] = useState<string>('#38bdf8');

  // Engine Refs (persistent across renders)
  const calendarRef = useRef<GameCalendarState>(calendar);
  calendarRef.current = calendar;

  const timeHourRef = useRef<number>(10.0);
  timeHourRef.current = timeHour;
  const displayTimeHourRef = useRef<number>(10.0);

  const isTimeAutoCyclingRef = useRef<boolean>(true);
  isTimeAutoCyclingRef.current = isTimeAutoCycling;

  const weatherRef = useRef<WeatherType>('clear');
  weatherRef.current = weather;

  const previousWeatherRef = useRef<WeatherType>('clear');

  const weatherTransitionRef = useRef<number>(1.0);
  weatherTransitionRef.current = weatherTransition;


  const isMainMenuOpenRef = useRef<boolean>(true);
  isMainMenuOpenRef.current = isMainMenuOpen;

  const modalStateRef = useRef({
    isInventoryOpen: false,
    isInspectionOpen: false,
    isConsoleOpen: false,
    isPerfConsoleOpen: false,
    isFullMapOpen: false,
    isSpawnMenuOpen: false,
    isRadialMenuOpen: false,
    isVehicleBoardOpen: false,
    isCrashDiagnosticsOpen: false,
    isCreativeMode: false,
    isVacuumPumpModalOpen: false,
    isCraneOutriggersModalOpen: false,
    isEngineBayOpen: false,
    isFuelNozzleModalOpen: false,
    isGasStationCashierModalOpen: false,
    isFurnitureStorageOpen: false,
    isShopOpen: false,
    isDealershipOpen: false,
    isRealEstateModalOpen: false,
    isPropertyDocumentModalOpen: false,
    isUserProfileModalOpen: false,
    isFriendsModalOpen: false,
    isDateTimePickerOpen: false,
    isPerfTestOpen: false,
    isCollisionTestOpen: false,
    hasActiveElevator: false,
  });
  modalStateRef.current = {
    isInventoryOpen,
    isInspectionOpen,
    isConsoleOpen,
    isPerfConsoleOpen,
    isFullMapOpen,
    isSpawnMenuOpen,
    isRadialMenuOpen,
    isVehicleBoardOpen,
    isCrashDiagnosticsOpen,
    isCreativeMode,
    isVacuumPumpModalOpen,
    isCraneOutriggersModalOpen,
    isEngineBayOpen,
    isFuelNozzleModalOpen,
    isGasStationCashierModalOpen,
    isFurnitureStorageOpen,
    isShopOpen,
    isDealershipOpen,
    isRealEstateModalOpen,
    isPropertyDocumentModalOpen,
    isUserProfileModalOpen,
    isFriendsModalOpen,
    isDateTimePickerOpen,
    isPerfTestOpen,
    isCollisionTestOpen,
    hasActiveElevator: Boolean(activeElevatorMenu),
  };

  // Time and Weather cycling functions
  const cycleTimePreset = () => {
    const current = timeHourRef.current;
    let next = 12.0;
    if (current < 8) next = 12.0;
    else if (current < 17) next = 18.5;
    else if (current < 21) next = 23.0;
    else next = 7.0;

    let diff = next - current;
    if (diff < 0) diff += 24;
    const { calendar: nextCal } = advanceCalendar(calendarRef.current, diff);
    calendarRef.current = nextCal;
    timeHourRef.current = nextCal.timeHour;
    setTimeHour(next);
    setCalendar({ ...nextCal });
    if (worldRef.current) {
      worldRef.current.calendar = nextCal;
      worldRef.current.season = nextCal.season;
      worldRef.current.timeHour = next;
    }
  };

  const setWeatherType = (nextWeather: WeatherType) => {
    if (nextWeather === weatherRef.current) return;
    const prev = weatherRef.current;
    previousWeatherRef.current = prev;
    setWeather(nextWeather);
    weatherRef.current = nextWeather;
    if (worldRef.current) {
      worldRef.current.previousWeather = prev;
      worldRef.current.weather = nextWeather;
      worldRef.current.weatherTransition = 0.0;
    }
    setWeatherTransition(0.0);
    weatherTransitionRef.current = 0.0;
  };

  const cycleWeather = () => {
    const types: WeatherType[] = ['clear', 'overcast', 'drizzle', 'rain', 'storm', 'fog', 'snow', 'blizzard'];
    const idx = types.indexOf(weather);
    const nextWeather = types[(idx + 1) % types.length];
    setWeatherType(nextWeather);

    const p = playerRef.current;
    if (p) {
      const weatherRu = 
        nextWeather === 'clear' ? 'Ясно' :
        nextWeather === 'overcast' ? 'Пасмурно' :
        nextWeather === 'drizzle' ? 'Морось' :
        nextWeather === 'rain' ? 'Дождь' :
        nextWeather === 'storm' ? 'Гроза' :
        nextWeather === 'fog' ? 'Туман' :
        nextWeather === 'snow' ? 'Снегопад' : 'Метель';
      addPlayerNotification(p, `Погода меняется: ${weatherRu}`, 'info');
    }
  };

  // Set the time of day directly (HUD scrubber / presets). The calendar date stays the same.
  const setTimeOfDay = (hour: number) => {
    const h = ((hour % 24) + 24) % 24;
    const c = calendarRef.current;
    const nextCal = createInitialCalendarState(c.year, c.month, c.day, h);
    calendarRef.current = nextCal;
    timeHourRef.current = nextCal.timeHour;
    setTimeHour(nextCal.timeHour);
    setCalendar({ ...nextCal });
    if (worldRef.current) {
      worldRef.current.calendar = nextCal;
      worldRef.current.season = nextCal.season;
      worldRef.current.timeHour = nextCal.timeHour;
    }
  };

  const buildPauseSession = (): PauseSessionInfo => {
    const ss = sessionStatsRef.current;
    const world = worldRef.current;
    const player = playerRef.current;
    const veh = world && player && player.isInVehicle && player.currentVehicleId
      ? world.vehicles.find(v => v.id === player.currentVehicleId) || null
      : null;
    const cat = veh ? getVehicleCatalogItem(veh.type) : undefined;
    const wm = activeWorldRef.current;
    return {
      locationName: world && player ? findStreetNameAtPosition(world, player.x, player.y) : '',
      timeHour: timeHourRef.current,
      vehicleType: veh ? veh.type : null,
      vehicleName: veh ? (cat?.nameRu || veh.nameRu || CAR_CONFIGS[veh.type]?.name || null) : null,
      vehicleColor: veh?.color,
      vehicleRoofColor: veh?.roofColor,
      // 1 px of the world = 0.0625 m (see PX_S_TO_SPEED_KMH)
      distanceKm: ss.distPx * 0.0625 / 1000,
      maxKmh: ss.maxKmh,
      minutes: Math.floor(ss.playMs / 60000),
      lastSaveAt: ss.lastSaveAt,
      worldOrigin: wm.origin,
      worldName: wm.worldName,
      serverRoomCode: wm.serverRoomCode || (onlineManager.status === 'connected' ? onlineManager.roomCode : undefined)
    };
  };

  const openPauseMenu = () => {
    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.handbrake = false;
    inputRef.current.sprint = false;
    setIsRadialMenuOpen(false);
    setIsVehicleBoardOpen(false);
    setIsPauseMenuOpen(true);
  };

  const handleApplyDateAndTimeAndWeather = (
    year: number, 
    month: number, 
    day: number, 
    hour: number, 
    newWeather: WeatherType
  ) => {
    const newCal = createInitialCalendarState(year, month, day, hour);
    calendarRef.current = newCal;
    setCalendar(newCal);
    timeHourRef.current = newCal.timeHour;
    setTimeHour(newCal.timeHour);
    
    const prev = weatherRef.current;
    previousWeatherRef.current = prev;
    if (worldRef.current) {
      const prevMonth = worldRef.current.calendar?.month;
      const prevSeason = worldRef.current.calendar?.season;
      worldRef.current.calendar = newCal;
      worldRef.current.season = newCal.season;
      worldRef.current.timeHour = newCal.timeHour;
      worldRef.current.previousWeather = prev;
      worldRef.current.weather = newWeather;
      worldRef.current.weatherTransition = 0.0;
      // Re-seed surface hydrology when jumping across dates/months (natural midnight tick does NOT snap)
      if (prevMonth !== newCal.month || prevSeason !== newCal.season) {
        Object.assign(worldRef.current, getInitialSurfaceHydrologyForCalendar(newCal, newWeather));
      } else {
        ensureWorldSurfaceHydrology(worldRef.current);
      }
    }
    
    setWeather(newWeather);
    weatherRef.current = newWeather;
    setWeatherTransition(0.0);
    weatherTransitionRef.current = 0.0;
    
    const p = playerRef.current;
    if (p) {
      addPlayerNotification(
        p, 
        `Установлено: ${formatGameDate(newCal, 'medium')} • ${formatGameTime(newCal.timeHour)} (${getRussianSeasonName(newCal.season)})`, 
        'info'
      );
    }
  };

  const handleStepGameDay = (deltaDays: number) => {
    const { calendar: nextCal } = advanceCalendar(calendarRef.current, deltaDays * 24.0);
    calendarRef.current = nextCal;
    timeHourRef.current = nextCal.timeHour;
    setTimeHour(nextCal.timeHour);
    setCalendar({ ...nextCal });
    if (worldRef.current) {
      worldRef.current.calendar = nextCal;
      worldRef.current.season = nextCal.season;
      worldRef.current.timeHour = nextCal.timeHour;
    }
    const p = playerRef.current;
    if (p) {
      addPlayerNotification(
        p, 
        `Дата: ${formatGameDate(nextCal, 'medium')} (${getRussianSeasonName(nextCal.season)})`, 
        'info'
      );
    }
  };

  const getTimeLabelName = (h: number) => {
    if (h >= 5 && h < 8) return 'Рассвет';
    if (h >= 8 && h < 17) return 'День';
    if (h >= 17 && h < 21) return 'Закат';
    return 'Ночь';
  };

  // --- REAL ISOLATED WORLD & SAVE/LOAD ENGINE ---
  const [saves, setSaves] = useState<any[]>([]);
  const savesRef = useRef<any[]>([]);
  savesRef.current = saves;

  const activeWorldRef = useRef<{
    worldId: string;
    worldName: string;
    origin: 'singleplayer' | 'server';
    serverRoomCode?: string;
    serverName?: string;
  }>({
    worldId: `world_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    worldName: 'flatbody',
    origin: 'singleplayer'
  });

  const lastAppliedWorldSyncRef = useRef<number>(0);

  const createDefaultEquippedClothing = () => ({
    torso: { shirt: createItem('sweater_blue', 1) },
    legs: { shirt: createItem('jeans_blue', 1) },
    feet: { outerwear: createItem('work_boots', 1) },
    back: { outerwear: createItem('backpack', 1) }
  });

  const resetPlayerToFreshState = (player: Player, spawnLoc: { x: number; y: number }) => {
    player.x = spawnLoc.x;
    player.y = spawnLoc.y;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.angle = 0;
    player.isInVehicle = false;
    player.currentVehicleId = null;
    player.isInsideBuilding = false;
    player.insideBuildingId = null;
    player.isInsideApartment = false;
    player.insideApartmentId = null;
    player.currentFloor = 0;
    player.cash = 0;
    player.selectedHotbarIndex = 0;
    setSelectedHotbarIndex(0);
    player.bodyState = defaultBodyState();
    player.isFainting = false;
    player.needsHospitalEvacuation = false;
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
      fullness: 50,
      nausea: 0,
      isSleeping: false
    };
    player.equippedClothing = createDefaultEquippedClothing();
    player.leftHandItem = null;
    player.rightHandItem = null;
    player.activeHand = 'right';
    player.inventory = createDefaultPlayerInventory();
    player.notifications = [];
  };

  const resetAllWorldSingletons = (world: GameWorld) => {
    resetCityApartmentsForWorld(world);
    clearInteriorCanvasCache();
    resetFurnitureStorages();
    TaxiFleetSystem.getInstance().resetState();
    resetActiveWorldPhoneNotes();
  };

  // Load saves list from IndexedDB (with automatic legacy localStorage migration) on mount
  useEffect(() => {
    let alive = true;
    loadSavesFromStorage()
      .then((loaded) => {
        if (alive && Array.isArray(loaded)) {
          setSaves(loaded);
        }
      })
      .catch((e) => {
        console.error('Error loading saves from IndexedDB', e);
      });
    return () => { alive = false; };
  }, []);

  const syncSavesToStorage = (updatedSaves: any[]) => {
    setSaves(updatedSaves);
    void saveSavesToStorage(updatedSaves);
  };

  const handleCreateSave = (
    customName?: string,
    opts?: { isAutosave?: boolean }
  ) => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return;

    const isAutosave = Boolean(opts?.isAutosave || customName === 'Автосохранение');
    const isConnectedGuest = onlineManager.status === 'connected' && !onlineManager.isHost;

    // Guests on a foreign server cannot manually export/save it; autosave runs only after authentication and if server allows savePlayerData
    if (isConnectedGuest) {
      if (
        !isAutosave ||
        onlineManager.authState !== 'authenticated' ||
        onlineManager.serverSettings.savePlayerData === false
      ) {
        return;
      }
    }

    const activeMeta = activeWorldRef.current;
    const targetOrigin: 'singleplayer' | 'server' = activeMeta.origin;
    const targetWorldId = activeMeta.worldId;

    // Get current street name
    const currentStreet = findStreetNameAtPosition(world, player.x, player.y);

    const currentCal = calendarRef.current;
    const timeString = formatGameTime(currentCal.timeHour);
    const dateString = formatGameDate(currentCal, 'short');

    const worldLabel = targetOrigin === 'server'
      ? (activeMeta.serverName || activeMeta.worldName || `Сервер ${activeMeta.serverRoomCode || ''}`).trim()
      : (activeMeta.worldName && activeMeta.worldName !== 'flatbody' ? activeMeta.worldName : currentStreet);

    const saveName = isAutosave
      ? `Авто · ${worldLabel}`
      : (customName || (targetOrigin === 'server' ? `${worldLabel} · ${currentStreet}` : `Улица: ${currentStreet}`));

    // Collect all vehicle IDs that have a linked key in player possession or ownership
    const keyedVehicleIds = new Set<string>();
    const scanItemForVehicleKey = (item: any) => {
      if (!item) return;
      if (item.vehicleId) {
        keyedVehicleIds.add(item.vehicleId);
      }
      if (Array.isArray(item.contents)) {
        item.contents.forEach(scanItemForVehicleKey);
      }
    };

    if (player.inventory) {
      player.inventory.forEach(scanItemForVehicleKey);
    }
    if ((player as any).leftHandItem) scanItemForVehicleKey((player as any).leftHandItem);
    if ((player as any).rightHandItem) scanItemForVehicleKey((player as any).rightHandItem);
    if (player.equippedClothing) {
      Object.values(player.equippedClothing).forEach((clothingItem: any) => {
        scanItemForVehicleKey(clothingItem);
      });
    }
    if (player.currentVehicleId) {
      keyedVehicleIds.add(player.currentVehicleId);
    }

    // Filter world vehicles to strictly save only local player's keyed/owned/hitched vehicles (never remote players' ghost cars)
    const savedVehicles = (world.vehicles || [])
      .filter(v =>
        !(v as any).isRemoteControlled && (
          keyedVehicleIds.has(v.id) ||
          v.ownerId === 'player' ||
          (v as any).playerOwned ||
          (v as any).isSpawnedByPlayer ||
          Boolean(v.keyId) ||
          Boolean(v.insertedKeyType) ||
          Boolean(v.insertedKeyId) ||
          v.id === player.currentVehicleId ||
          Boolean(v.trailerId) ||
          Boolean(v.towedById)
        )
      )
      .map(v => ({
        id: v.id,
        keyId: v.keyId,
        keyTier: v.keyTier,
        insertedKeyType: v.insertedKeyType,
        insertedKeyId: v.insertedKeyId,
        ownerId: v.ownerId || 'player',
        playerOwned: (v as any).playerOwned ?? (v.ownerId === 'player'),
        isSpawnedByPlayer: (v as any).isSpawnedByPlayer ?? (v.ownerId === 'player'),
        isLocked: Boolean(v.isLocked),
        type: v.type,
        x: v.x,
        y: v.y,
        angle: v.angle,
        speed: v.speed,
        color: v.color,
        roofColor: v.roofColor,
        hasGBO: v.hasGBO,
        tractorBrakeLatch: v.tractorBrakeLatch,
        hasRearviewCamera: v.hasRearviewCamera,
        hasHeavySuspension: (v as any).hasHeavySuspension,
        hasChiptuning: (v as any).hasChiptuning,
        fuelSystem: v.fuelSystem ? JSON.parse(JSON.stringify(v.fuelSystem)) : undefined,
        engineState: v.engineState ? JSON.parse(JSON.stringify(v.engineState)) : undefined,
        damage: v.damage ? JSON.parse(JSON.stringify(v.damage)) : undefined,
        fluidTank: v.fluidTank ? JSON.parse(JSON.stringify(v.fluidTank)) : undefined,
        isParked: v.isParked,
        isDerelict: v.isDerelict,
        isPtoActive: v.isPtoActive,
        windowOpen: v.windowOpen,
        headlightsOn: v.headlightsOn,
        headlightMode: v.headlightMode,
        trailerId: v.trailerId,
        towedById: v.towedById,
        trailerPlugConnected: v.trailerPlugConnected,
        trailerBrakesConnected: v.trailerBrakesConnected,
        trailerParkingBrakeEngaged: v.trailerParkingBrakeEngaged,
        diffLock: v.diffLock ? { ...v.diffLock } : undefined,
        transferCaseMode: v.transferCaseMode
      }));

    const newSave = {
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
      worldId: targetWorldId,
      origin: targetOrigin,
      mapId: 'flatbody',
      modIds: [] as string[],
      serverRoomCode: targetOrigin === 'server' ? activeMeta.serverRoomCode : undefined,
      serverName: targetOrigin === 'server' ? activeMeta.serverName : undefined,
      isAutosave,
      name: saveName,
      date: `${dateString} в ${timeString}`,
      mode: world.gameMode || 'career',
      playerX: player.x,
      playerY: player.y,
      playerAngle: player.angle,
      isInVehicle: player.isInVehicle,
      currentVehicleId: player.currentVehicleId,
      timeHour: timeHourRef.current,
      calendar: { ...currentCal },
      season: currentCal.season,
      weather: weatherRef.current,
      streetName: currentStreet,
      gpsDestination: gpsDestination,
      needs: player.needs ? JSON.parse(JSON.stringify(player.needs)) : undefined,
      bodyState: player.bodyState ? JSON.parse(JSON.stringify(player.bodyState)) : undefined,
      inventory: player.inventory ? JSON.parse(JSON.stringify(player.inventory)) : undefined,
      equippedClothing: player.equippedClothing ? JSON.parse(JSON.stringify(player.equippedClothing)) : undefined,
      leftHandItem: player.leftHandItem ? JSON.parse(JSON.stringify(player.leftHandItem)) : null,
      rightHandItem: player.rightHandItem ? JSON.parse(JSON.stringify(player.rightHandItem)) : null,
      activeHand: player.activeHand || 'right',
      cash: getPlayerCash(player),
      selectedHotbarIndex: player.selectedHotbarIndex || 0,
      vehicles: savedVehicles,
      towingRopes: world.towingRopes ? JSON.parse(JSON.stringify(world.towingRopes)) : [],
      groundItems: world.groundItems ? JSON.parse(JSON.stringify(world.groundItems)) : [],
      isInsideBuilding: player.isInsideBuilding || false,
      insideBuildingId: player.insideBuildingId || null,
      isInsideApartment: player.isInsideApartment || false,
      insideApartmentId: player.insideApartmentId || null,
      currentFloor: player.currentFloor || 0,
      apartmentsState: getCityApartments().map(a => ({
        id: a.id,
        isOwned: a.isOwned,
        isLocked: a.isLocked,
        ownerName: a.ownerName,
        purchaseDate: a.purchaseDate,
        dynamicFurniture: a.dynamicFurniture ? JSON.parse(JSON.stringify(a.dynamicFurniture)) : [],
        layoutFurniture: a.layout?.furniture ? JSON.parse(JSON.stringify(a.layout.furniture)) : undefined
      })),
      furnitureStorageState: exportFurnitureStorageData(),
      taxiProfile: TaxiFleetSystem.getInstance().exportState(),
      phoneNotes: getActiveWorldPhoneNotes()
    };

    let updated = [...savesRef.current];
    if (isAutosave) {
      // Only overwrite the autosave belonging to THIS specific worldId (never clobber other worlds!)
      updated = updated.filter(
        s => !((s.isAutosave || s.name === 'Автосохранение') && (s.worldId || 'legacy') === targetWorldId)
      );
    }
    updated.unshift(newSave);
    syncSavesToStorage(updated);
    sessionStatsRef.current.lastSaveAt = Date.now();
  };

  const reloadFreshMap = async () => {
    try {
      const freshWorld = await loadMap();
      worldRef.current = freshWorld;
      const bldGrid = spatialGridBuildingsRef.current;
      bldGrid.clear();
      freshWorld.buildings.forEach((b) => bldGrid.insert(b));

      const treeGrid = spatialGridTreesRef.current;
      treeGrid.clear();
      freshWorld.trees.forEach((t) => treeGrid.insert(t));

      const propGrid = spatialGridPropsRef.current;
      propGrid.clear();
      freshWorld.props.forEach((p) => propGrid.insert(p));

      const swGrid = spatialGridSidewalksRef.current;
      swGrid.clear();
      (freshWorld.sidewalks || []).forEach((sw) => swGrid.insert(sw));

      seedInitialGroundItems(freshWorld);
      setTrafficCount(freshWorld.vehicles.length);
      setPedCount(freshWorld.pedestrians.length);
    } catch (err) {
      console.error('[App] Failed to reload map:', err);
    }
  };

  const waitMs = (ms: number) => new Promise<void>(resolve => window.setTimeout(resolve, ms));

  const applySavedStateToWorld = (save: any, world: GameWorld, player: Player, camera: Camera) => {
    const saveMode: 'career' | 'freeroam' = save.mode || 'career';

    // 1. Cleanly reset ALL world singletons and player fields BEFORE restoring save data
    resetAllWorldSingletons(world);
    resetPlayerToFreshState(player, { x: save.playerX || 4400, y: save.playerY || 2800 });

    // Prevent stuck input keys
    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.handbrake = false;
    inputRef.current.sprint = false;

    // 2. Restore environmental state & calendar
    if (save.calendar) {
      calendarRef.current = { ...save.calendar };
      setCalendar({ ...save.calendar });
    } else {
      const savedH = typeof save.timeHour === 'number' ? save.timeHour : 10.0;
      const restored = createInitialCalendarState(2026, 10, 8, savedH);
      calendarRef.current = restored;
      setCalendar(restored);
    }
    const targetWeather: WeatherType = save.weather || 'clear';
    setTimeHour(calendarRef.current.timeHour);
    timeHourRef.current = calendarRef.current.timeHour;
    setWeather(targetWeather);
    weatherRef.current = targetWeather;
    previousWeatherRef.current = targetWeather;
    weatherTransitionRef.current = 1.0;
    setWeatherTransition(1.0);
    world.calendar = { ...calendarRef.current };
    world.season = calendarRef.current.season;
    world.timeHour = calendarRef.current.timeHour;
    world.weather = targetWeather;
    world.previousWeather = targetWeather;
    world.weatherTransition = 1.0;
    world.particles.length = 0;
    world.wind = undefined;
    updateWorldWind(world, 0.016);
    world.outsideTemp = getOutsideTemperature(world, world.timeHour);
    Object.assign(world, getInitialSurfaceHydrologyForCalendar(calendarRef.current, targetWeather));
    handleSetGpsTarget(save.gpsDestination ?? null);

    // 3. Restore player status & survival needs
    player.x = save.playerX;
    player.y = save.playerY;
    player.angle = save.playerAngle || 0;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.isInVehicle = Boolean(save.isInVehicle);
    player.currentVehicleId = save.currentVehicleId || null;
    if (save.cash !== undefined) player.cash = save.cash;
    if (save.selectedHotbarIndex !== undefined) {
      player.selectedHotbarIndex = save.selectedHotbarIndex;
      setSelectedHotbarIndex(save.selectedHotbarIndex);
    }

    if (save.needs && player.needs) {
      player.needs = { ...player.needs, ...save.needs };
    }
    if (save.bodyState && player.bodyState) {
      player.bodyState = JSON.parse(JSON.stringify(save.bodyState));
    }
    if (save.inventory) {
      player.inventory = JSON.parse(JSON.stringify(save.inventory));
    }
    if (save.equippedClothing) {
      player.equippedClothing = JSON.parse(JSON.stringify(save.equippedClothing));
    }
    player.leftHandItem = save.leftHandItem ? JSON.parse(JSON.stringify(save.leftHandItem)) : null;
    player.rightHandItem = save.rightHandItem ? JSON.parse(JSON.stringify(save.rightHandItem)) : null;
    player.activeHand = save.activeHand || 'right';

    if (save.groundItems && Array.isArray(save.groundItems)) {
      world.groundItems = JSON.parse(JSON.stringify(save.groundItems));
    }
    if (save.towingRopes && Array.isArray(save.towingRopes)) {
      world.towingRopes = JSON.parse(JSON.stringify(save.towingRopes));
    }

    // 4. Restore saved player-owned / keyed vehicles
    if (save.vehicles && Array.isArray(save.vehicles)) {
      save.vehicles.forEach((sv: any) => {
        let v = world.vehicles.find(item => item.id === sv.id);
        if (!v) {
          const cfg = CAR_CONFIGS[sv.type as CarType] || CAR_CONFIGS.sedan;
          v = {
            id: sv.id,
            keyId: sv.keyId || sv.id,
            keyTier: sv.keyTier,
            insertedKeyType: sv.insertedKeyType,
            insertedKeyId: sv.insertedKeyId,
            type: sv.type,
            x: sv.x,
            y: sv.y,
            vx: 0,
            vy: 0,
            angle: sv.angle || 0,
            steerAngle: 0,
            targetSteerAngle: 0,
            speed: 0,
            lateralVelocity: 0,
            angularVelocity: 0,
            isDrifting: false,
            driftFactor: 0,
            mass: cfg.mass || 1200,
            width: cfg.width,
            length: cfg.length,
            wheelBase: cfg.wheelBase,
            color: sv.color || '#3b82f6',
            roofColor: sv.roofColor || sv.color || '#3b82f6',
            headlightsOn: sv.headlightsOn || false,
            headlightMode: sv.headlightMode || 'off',
            brakeLightsOn: false,
            isReversing: false,
            turnSignal: 'none',
            turnSignalTimer: 0,
            isLocked: sv.isLocked === true,
            ownerId: sv.ownerId || 'player',
            tractorBrakeLatch: sv.tractorBrakeLatch,
            hasRearviewCamera: sv.hasRearviewCamera,
            isParked: true,
            isPlayerControlled: false,
            targetSpeed: 0,
            currentLaneId: null,
            targetWaypointIndex: 0,
            routeWaypoints: [],
            aiState: 'parked',
            damage: sv.damage ? ensureVehicleDamage({ type: sv.type, length: cfg.length, width: cfg.width, mass: cfg.mass, damage: sv.damage }) : createDefaultVehicleDamage(cfg.length, cfg.width),
            engineState: sv.engineState ? { ...sv.engineState } : createDefaultEngineState(sv.type, false, true),
            fuelSystem: sv.fuelSystem ? { ...sv.fuelSystem } : createDefaultFuelSystem(sv.type, false),
            fluidTank: sv.fluidTank ? JSON.parse(JSON.stringify(sv.fluidTank)) : undefined,
            isPtoActive: sv.isPtoActive,
            windowOpen: sv.windowOpen,
            trailerId: sv.trailerId,
            towedById: sv.towedById,
            trailerPlugConnected: sv.trailerPlugConnected,
            trailerBrakesConnected: sv.trailerBrakesConnected,
            trailerParkingBrakeEngaged: sv.trailerParkingBrakeEngaged,
            diffLock: sv.diffLock ? { ...sv.diffLock } : undefined,
            transferCaseMode: sv.transferCaseMode,
            isDerelict: sv.isDerelict
          } as Vehicle;
          (v as any).playerOwned = sv.playerOwned ?? (sv.ownerId === 'player');
          (v as any).isSpawnedByPlayer = sv.isSpawnedByPlayer ?? (sv.ownerId === 'player');
          world.vehicles.push(v);
        }

        if (v) {
          v.x = sv.x;
          v.y = sv.y;
          v.angle = sv.angle;
          if (sv.keyId) v.keyId = sv.keyId;
          if (sv.keyTier) v.keyTier = sv.keyTier;
          v.insertedKeyType = sv.insertedKeyType;
          v.insertedKeyId = sv.insertedKeyId;
          if (sv.ownerId) v.ownerId = sv.ownerId;
          (v as any).playerOwned = sv.playerOwned ?? (v.ownerId === 'player');
          (v as any).isSpawnedByPlayer = sv.isSpawnedByPlayer ?? (v.ownerId === 'player');
          if (v.ownerId === 'player' || (v as any).playerOwned || (v as any).isSpawnedByPlayer || v.id === save.currentVehicleId || playerHasKeyForVehicle(player, v)) {
            v.isLocked = false;
          } else if (sv.isLocked !== undefined) {
            v.isLocked = sv.isLocked === true;
          } else {
            v.isLocked = false;
          }
          if (sv.tractorBrakeLatch !== undefined) v.tractorBrakeLatch = sv.tractorBrakeLatch;
          if (sv.hasRearviewCamera !== undefined) v.hasRearviewCamera = sv.hasRearviewCamera;
          if (sv.fluidTank) v.fluidTank = JSON.parse(JSON.stringify(sv.fluidTank));
          if (sv.isPtoActive !== undefined) v.isPtoActive = sv.isPtoActive;
          if (sv.windowOpen !== undefined) v.windowOpen = sv.windowOpen;
          if (sv.headlightsOn !== undefined) v.headlightsOn = sv.headlightsOn;
          if (sv.headlightMode !== undefined) v.headlightMode = sv.headlightMode;
          if (sv.trailerId !== undefined) v.trailerId = sv.trailerId;
          if (sv.towedById !== undefined) v.towedById = sv.towedById;
          if (sv.trailerPlugConnected !== undefined) v.trailerPlugConnected = sv.trailerPlugConnected;
          if (sv.trailerBrakesConnected !== undefined) v.trailerBrakesConnected = sv.trailerBrakesConnected;
          if (sv.trailerParkingBrakeEngaged !== undefined) v.trailerParkingBrakeEngaged = sv.trailerParkingBrakeEngaged;
          if (sv.diffLock) v.diffLock = { ...sv.diffLock };
          if (sv.transferCaseMode !== undefined) v.transferCaseMode = sv.transferCaseMode;
          if (sv.isDerelict !== undefined) v.isDerelict = sv.isDerelict;

          v.speed = 0;
          v.vx = 0;
          v.vy = 0;
          v.angularVelocity = 0;
          v.steerAngle = 0;
          if (sv.isParked !== undefined) v.isParked = sv.isParked;
          v.aiState = v.isParked ? 'parked' : 'driving';
          v.targetWaypointIndex = 0;
          v.routeWaypoints = [];
          v.currentConnection = undefined;
          v.knockbackVx = 0;
          v.knockbackVy = 0;
          v.knockbackSpin = 0;
          v.stunnedTimer = 2.0;
          v.ghostingAlpha = 1.0;

          if (sv.color) v.color = sv.color;
          if (sv.roofColor) v.roofColor = sv.roofColor;
          if (sv.hasGBO !== undefined) v.hasGBO = sv.hasGBO;
          if (sv.hasHeavySuspension !== undefined) (v as any).hasHeavySuspension = sv.hasHeavySuspension;
          if (sv.hasChiptuning !== undefined) (v as any).hasChiptuning = sv.hasChiptuning;

          if (sv.fuelSystem) v.fuelSystem = { ...sv.fuelSystem };
          if (sv.engineState) {
            v.engineState = { ...sv.engineState };
          } else {
            applyPowertrain(v, pickPowertrain(sv.type, makePowertrainRng(v.id)));
          }
          if (sv.damage) {
            v.damage = ensureVehicleDamage({ type: v.type, length: v.length, width: v.width, mass: v.mass, damage: sv.damage });
          }
        }
      });

      // Anti-overlap separation pass on load
      if (world.vehicles && world.vehicles.length > 1) {
        for (let i = 0; i < world.vehicles.length; i++) {
          for (let j = i + 1; j < world.vehicles.length; j++) {
            const c1 = world.vehicles[i];
            const c2 = world.vehicles[j];
            const dx = c2.x - c1.x;
            const dy = c2.y - c1.y;
            const dist = Math.hypot(dx, dy);
            const minDist = (c1.width + c2.width) * 0.75;
            if (dist < minDist && dist > 0.001) {
              const overlap = (minDist - dist) / 2;
              c1.x -= (dx / dist) * overlap;
              c1.y -= (dy / dist) * overlap;
              c2.x += (dx / dist) * overlap;
              c2.y += (dy / dist) * overlap;
            }
          }
        }
      }
    }

    setIsInVehicle(Boolean(save.isInVehicle));

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
        const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
        setActiveCarName(cfg?.name || 'Автомобиль');
        sound.startEngine();
      } else {
        player.isInVehicle = false;
        player.currentVehicleId = null;
        setIsInVehicle(false);
        setActiveCarName('');
        sound.stopEngine();
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

    // 5. Restore real-estate, furniture storages, taxi profile, and phone notes (strictly isolated)
    player.isInsideBuilding = save.isInsideBuilding || false;
    player.insideBuildingId = save.insideBuildingId || null;
    player.isInsideApartment = save.isInsideApartment || false;
    player.insideApartmentId = save.insideApartmentId || null;
    player.currentFloor = save.currentFloor || 0;

    if (save.apartmentsState && Array.isArray(save.apartmentsState)) {
      const allApts = getCityApartments();
      save.apartmentsState.forEach((sa: any) => {
        const a = allApts.find(apt => apt.id === sa.id);
        if (a) {
          a.isOwned = sa.isOwned;
          a.isLocked = sa.isLocked;
          a.ownerName = sa.ownerName;
          a.purchaseDate = sa.purchaseDate;
          a.dynamicFurniture = Array.isArray(sa.dynamicFurniture)
            ? JSON.parse(JSON.stringify(sa.dynamicFurniture))
            : [];
          if (Array.isArray(sa.layoutFurniture) && a.layout) {
            a.layout.furniture = JSON.parse(JSON.stringify(sa.layoutFurniture));
          }
        }
      });
      clearInteriorCanvasCache();
    }

    importFurnitureStorageData((save as any).furnitureStorageState || null);
    TaxiFleetSystem.getInstance().importState((save as any).taxiProfile || null);
    setActiveWorldPhoneNotes(typeof (save as any).phoneNotes === 'string' ? (save as any).phoneNotes : DEFAULT_PHONE_NOTES);

    world.gameMode = saveMode;
    applyTrafficDefaultForMode(world.gameMode);
    if (world.gameMode === 'freeroam') {
      setIsTimeAutoCycling(false);
      isTimeAutoCyclingRef.current = false;
      world.pedestrians = [];
      world.vehicles = world.vehicles.filter(v => v.isParked || v.isDerelict || (v as any).playerOwned || v.ownerId === 'player' || Boolean(v.keyId));
    } else {
      setIsTimeAutoCycling(true);
      isTimeAutoCyclingRef.current = true;
    }
  };

  const handleLoadSave = async (saveId: string) => {
    const save = savesRef.current.find(s => s.id === saveId);
    // Server profiles cannot be loaded offline or converted to singleplayer worlds
    if (!save || save.origin === 'server') return;

    const saveMode: 'career' | 'freeroam' = save.mode || 'career';
    const playerSavedVeh = save.isInVehicle && save.currentVehicleId && Array.isArray(save.vehicles)
      ? save.vehicles.find((sv: any) => sv.id === save.currentVehicleId)
      : (Array.isArray(save.vehicles) && save.vehicles.length > 0 ? save.vehicles[0] : null);
    const savedVehCfg = playerSavedVeh ? (CAR_CONFIGS[playerSavedVeh.type as CarType] || CAR_CONFIGS.sedan) : null;

    setLoadingScreen({
      isOpen: true,
      actionType: 'load_save',
      title: save.name || 'Загрузка сессии',
      subtitle: saveMode === 'freeroam' ? 'Загрузка сохранения · Freeroam' : 'Загрузка сохранения · Карьера',
      stepText: 'Чтение карты города и изоляция мира...',
      progress: 18,
      mode: saveMode,
      locationName: save.streetName || 'Центральный район',
      timeHour: typeof save.timeHour === 'number' ? save.timeHour : 12,
      weather: save.weather || 'clear',
      vehicleType: playerSavedVeh?.type,
      vehicleName: savedVehCfg?.name || (save.isInVehicle ? 'Автомобиль' : 'Пешком'),
      vehicleColor: playerSavedVeh?.color,
      vehicleRoofColor: playerSavedVeh?.roofColor,
      saveName: save.name
    });

    await waitMs(60);

    onlineManager.leaveRoom();
    await closeHostSession();
    await reloadFreshMap();

    setLoadingScreen(prev => ({
      ...prev,
      stepText: 'Восстановление транспорта, объектов и состояния мира...',
      progress: 62
    }));
    await waitMs(90);

    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) {
      setLoadingScreen(prev => ({ ...prev, isOpen: false }));
      return;
    }

    resetSessionStats();
    applySavedStateToWorld(save, world, player, camera);

    activeWorldRef.current = {
      worldId: save.worldId || `world_${save.id}`,
      worldName: (save.name || 'flatbody').replace(/^Авто ·\s*/, ''),
      origin: 'singleplayer'
    };

    setLoadingScreen(prev => ({
      ...prev,
      stepText: 'Синхронизация камеры и запуск сессии...',
      progress: 100
    }));
    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
    await waitMs(180);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteSave = (saveId: string) => {
    const updated = savesRef.current.filter(s => s.id !== saveId);
    syncSavesToStorage(updated);
  };

  const handleNewGame = async (options?: {
    spawnId?: string;
    saveName?: string;
    timeHour?: number;
    weather?: WeatherType;
    mode?: 'career' | 'freeroam';
    vehicleType?: string;
    vehicleColor?: string;
    powertrain?: { engineId?: string; transmissionId?: string; tuneId?: string; tireSetId?: string; turboKitId?: string; frameId?: string; bodyId?: string };
  } | string) => {
    const opts = typeof options === 'string' ? { spawnId: options, mode: 'career' as const } : (options || {});
    const mode = opts.mode || 'career';
    const previewSpawnLoc = SPAWN_LOCATIONS.find(s => s.id === opts.spawnId) || SPAWN_LOCATIONS[0];
    const vehCfg = opts.vehicleType ? (CAR_CONFIGS[opts.vehicleType] || CAR_CONFIGS.sedan) : null;
    const targetTime = opts.timeHour !== undefined ? opts.timeHour : 12.0;
    const targetWeather: WeatherType = opts.weather || 'clear';

    setLoadingScreen({
      isOpen: true,
      actionType: mode === 'freeroam' ? 'new_freeroam' : 'new_career',
      title: previewSpawnLoc.nameRu.split('(')[0].trim(),
      subtitle: mode === 'freeroam' ? 'Новая сессия · Свободная езда' : 'Новая сессия · Карьера',
      stepText: 'Загрузка чистой карты города и сброс систем мира...',
      progress: 16,
      mode,
      locationName: previewSpawnLoc.nameRu.split('(')[0].trim(),
      locationCategory: previewSpawnLoc.category,
      timeHour: targetTime,
      weather: targetWeather,
      vehicleType: opts.vehicleType,
      vehicleName: vehCfg ? vehCfg.name : 'Пешком',
      vehicleColor: opts.vehicleColor,
      vehicleRoofColor: opts.vehicleColor,
      frameId: opts.powertrain?.frameId,
      bodyId: opts.powertrain?.bodyId,
      saveName: opts.saveName
    });

    await waitMs(60);

    onlineManager.leaveRoom();
    await closeHostSession();
    await reloadFreshMap();

    setLoadingScreen(prev => ({
      ...prev,
      stepText: mode === 'freeroam'
        ? 'Подготовка точки старта и сборка выбранного автомобиля...'
        : 'Инициализация трафика, пешеходов и городской среды...',
      progress: 64
    }));
    await waitMs(90);

    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) {
      setLoadingScreen(prev => ({ ...prev, isOpen: false }));
      return;
    }
    resetSessionStats();
    resetAllWorldSingletons(world);

    const newWorldId = `world_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    activeWorldRef.current = {
      worldId: newWorldId,
      worldName: opts.saveName || previewSpawnLoc.nameRu.split('(')[0].trim(),
      origin: 'singleplayer'
    };

    world.gameMode = mode;
    applyTrafficDefaultForMode(mode);

    inputRef.current.forward = false;
    inputRef.current.backward = false;
    inputRef.current.left = false;
    inputRef.current.right = false;
    inputRef.current.handbrake = false;
    inputRef.current.sprint = false;

    const spawnLoc = getAllSpawnLocations(worldRef.current).find(s => s.id === opts.spawnId) || SPAWN_LOCATIONS[0];
    setCurrentSpawnId(spawnLoc.id);
    setIsSpawnMenuOpen(false);

    resetPlayerToFreshState(player, spawnLoc);

    setIsInVehicle(false);
    setActiveCarName('');
    sound.stopEngine();

    const initialCal = createInitialCalendarState(2026, 10, 8, targetTime);
    calendarRef.current = initialCal;
    setCalendar(initialCal);
    setTimeHour(targetTime);
    timeHourRef.current = targetTime;
    setWeather(targetWeather);
    weatherRef.current = targetWeather;
    world.calendar = initialCal;
    world.season = initialCal.season;
    world.timeHour = targetTime;
    world.weather = targetWeather;
    world.previousWeather = targetWeather;
    world.weatherTransition = 1.0;
    Object.assign(world, getInitialSurfaceHydrologyForCalendar(initialCal, targetWeather));
    handleSetGpsTarget(null);

    if (mode === 'freeroam') {
      setIsTimeAutoCycling(false);
      isTimeAutoCyclingRef.current = false;
      world.pedestrians = [];
      // Clear dynamic AI traffic, keep only static/derelict or player-owned
      world.vehicles = world.vehicles.filter(v => v.isParked || v.isDerelict || (v as any).playerOwned || v.ownerId === 'player');

      if (opts.vehicleType) {
        const carType = opts.vehicleType;
        const config = CAR_CONFIGS[carType] || CAR_CONFIGS.sedan;
        const fs = createDefaultFuelSystem(carType as any, false);
        const keyId = `key_freeroam_${Date.now()}`;
        const newVehicle: Vehicle = {
          id: `freeroam_car_${Date.now()}`,
          type: carType as any,
          x: spawnLoc.x,
          y: spawnLoc.y,
          vx: 0,
          vy: 0,
          angle: 0,
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
          color: opts.vehicleColor || '#38bdf8',
          roofColor: opts.vehicleColor || '#38bdf8',
          headlightsOn: false,
          headlightMode: 'off',
          brakeLightsOn: false,
          isReversing: false,
          turnSignal: 'none',
          turnSignalTimer: 0,
          requiredFuel: fs.fuelType === 'diesel' ? 'diesel' : (fs.octaneNumber === 92 ? 'ai92' : 'ai95'),
          hasGBO: false,
          engineState: createDefaultEngineState(carType as any, true, false),
          fuelSystem: fs,
          damage: createDefaultVehicleDamage(config.length, config.width),
          isPlayerControlled: true,
          isParked: false,
          ownerId: 'player',
          keyId: keyId,
          insertedKeyType: 'car_key',
          insertedKeyId: keyId,
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
        (newVehicle as any).isSpawnedByPlayer = true;
        (newVehicle as any).playerOwned = true;
        const prevSpawnLen = newVehicle.length;
        applyPowertrain(newVehicle, buildPowertrainPick(carType, opts.powertrain));
        if (newVehicle.length !== prevSpawnLen) {
          newVehicle.damage = createDefaultVehicleDamage(newVehicle.length, newVehicle.width);
        }
        world.vehicles.push(newVehicle);
        spatialGridVehiclesRef.current.insert(newVehicle);

        player.isInVehicle = true;
        player.currentVehicleId = newVehicle.id;
        setIsInVehicle(true);
        setActiveCarName(config.name);

        const carKeyItem = createItem('car_key', 1);
        carKeyItem.nameRu = `Ключ (${config.name})`;
        (carKeyItem as any).carKeyId = keyId;
        (carKeyItem as any).vehicleId = newVehicle.id;
        addItemToPlayer(player, carKeyItem);

        sound.startEngine();
        addPlayerNotification(player, newVehicle.powertrainLabel || describePowertrain(newVehicle), 'info');
      }
    } else {
      setIsTimeAutoCycling(true);
      isTimeAutoCyclingRef.current = true;
    }

    camera.x = spawnLoc.x;
    camera.y = spawnLoc.y;
    camera.targetX = spawnLoc.x;
    camera.targetY = spawnLoc.y;
    camera.targetZoom = 1.15;

    if (opts.saveName) {
      setLoadingScreen(prev => ({
        ...prev,
        stepText: 'Создание файла сохранения сессии...',
        progress: 90
      }));
      await waitMs(70);
      handleCreateSave(opts.saveName);
    }

    setLoadingScreen(prev => ({
      ...prev,
      stepText: 'Готово к старту',
      progress: 100
    }));
    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
    await waitMs(180);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  /**
   * Connects to a multiplayer P2P server in its own completely isolated world (separate from singleplayer saves).
   * Restores the player's own saved progress for this specific server ONLY after host authentication completes.
   */
  const handleJoinServerWorld = async (opts: {
    roomCode: string;
    nickname?: string;
    serverName?: string;
    gameMode?: string;
  }) => {
    const cleanCode = onlineManager.sanitizeRoomCode(opts.roomCode);
    if (!cleanCode) return;

    const nick = (opts.nickname || onlineManager.localPlayerName || 'Игрок').trim() || 'Игрок';
    const normNick = nick.toLowerCase().replace(/\s+/g, ' ');
    const serverWorldId = `server_${cleanCode}_${normNick}`;
    const legacyWorldId = `server_${cleanCode}`;
    const previewSave = savesRef.current.find(
      s => (s.worldId === serverWorldId || s.worldId === legacyWorldId) && s.origin === 'server'
    );
    const resolvedMode: 'career' | 'freeroam' =
      previewSave?.mode || (opts.gameMode === 'free_roam' || opts.gameMode === 'drift' ? 'freeroam' : 'career');

    setLoadingScreen({
      isOpen: true,
      actionType: 'load_save',
      title: opts.serverName || `Сервер ${cleanCode}`,
      subtitle: 'Подключение к изолированному миру сервера',
      stepText: 'Изоляция локальных данных и загрузка карты сервера...',
      progress: 22,
      mode: resolvedMode,
      locationName: 'Центр города',
      timeHour: 12,
      weather: 'clear'
    });

    await waitMs(60);

    pendingGuestServerSaveRef.current = null;
    onlineManager.leaveRoom();
    await closeHostSession();
    await reloadFreshMap();

    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) {
      setLoadingScreen(prev => ({ ...prev, isOpen: false }));
      return;
    }

    resetSessionStats();
    lastAppliedWorldSyncRef.current = 0;

    activeWorldRef.current = {
      worldId: serverWorldId,
      worldName: opts.serverName || `Сервер ${cleanCode}`,
      origin: 'server',
      serverRoomCode: cleanCode,
      serverName: opts.serverName || `Сервер ${cleanCode}`
    };

    // Always start in a clean neutral world state; local server profile is applied ONLY after authState === 'authenticated'
    resetAllWorldSingletons(world);
    const spawnLoc = SPAWN_LOCATIONS[0];
    resetPlayerToFreshState(player, spawnLoc);
    setIsInVehicle(false);
    setActiveCarName('');
    sound.stopEngine();

    const initialCal = createInitialCalendarState(2026, 10, 8, 12.0);
    calendarRef.current = initialCal;
    setCalendar(initialCal);
    setTimeHour(12.0);
    timeHourRef.current = 12.0;
    setWeather('clear');
    weatherRef.current = 'clear';
    world.calendar = initialCal;
    world.season = initialCal.season;
    world.timeHour = 12.0;
    world.weather = 'clear';
    world.previousWeather = 'clear';
    world.weatherTransition = 1.0;
    Object.assign(world, getInitialSurfaceHydrologyForCalendar(initialCal, 'clear'));
    handleSetGpsTarget(null);

    world.gameMode = resolvedMode;
    applyTrafficDefaultForMode(resolvedMode);
    // Network guest receives all dynamic AI vehicles & pedestrians authoritatively from Host
    world.pedestrians = [];
    world.vehicles = world.vehicles.filter(
      (v) => v.isParked || v.isDerelict || (v as any).playerOwned || v.ownerId === 'player' || Boolean(v.keyId)
    );
    camera.x = spawnLoc.x;
    camera.y = spawnLoc.y;
    camera.targetX = spawnLoc.x;
    camera.targetY = spawnLoc.y;
    camera.targetZoom = 1.15;

    pendingGuestServerSaveRef.current = {
      roomCode: cleanCode,
      serverWorldId,
      legacyWorldId
    };

    setLoadingScreen(prev => ({
      ...prev,
      stepText: `Подключение к комнате ${cleanCode}...`,
      progress: 80
    }));

    onlineManager.joinOrCreateRoom(cleanCode, nick, false, opts.serverName);
    addPlayerNotification(
      player,
      `Подключение к серверу ${opts.serverName || cleanCode}...`,
      'info'
    );

    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
    await waitMs(160);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  /**
   * Creates and hosts a brand-new isolated server world from the Main Menu or Online Modal.
   */
  const handleCreateServerWorld = async (opts: {
    access?: HostAccess;
    roomCode: string;
    serverName: string;
    nickname: string;
    gameMode: string;
    maxPlayers: number;
    trafficEnabled: boolean;
    vehicleCount: number;
    pedestrianCount: number;
    passwordRequired: boolean;
    savePlayerData: boolean;
    antiCheat: AntiCheatLevel;
  }) => {
    const cleanCode = onlineManager.sanitizeRoomCode(opts.roomCode) || ('room-' + Math.floor(1000 + Math.random() * 9000));
    const resolvedAccess: HostAccess = opts.access || 'all';
    const resolvedMode: 'career' | 'freeroam' =
      opts.gameMode === 'free_roam' || opts.gameMode === 'drift' ? 'freeroam' : 'career';
    const serverWorldId = `server_${cleanCode}`;
    const existingServerSave = opts.savePlayerData
      ? savesRef.current.find(s => s.worldId === serverWorldId && s.origin === 'server')
      : null;

    setLoadingScreen({
      isOpen: true,
      actionType: resolvedMode === 'freeroam' ? 'new_freeroam' : 'new_career',
      title: opts.serverName || `Сервер ${cleanCode}`,
      subtitle: resolvedAccess === 'code' ? 'Создание приватного сервера (только по коду)' : 'Создание публичного мира сервера',
      stepText: 'Инициализация чистого мира и сетевого хоста...',
      progress: 25,
      mode: resolvedMode,
      locationName: 'Центр города',
      timeHour: 12,
      weather: 'clear'
    });

    await waitMs(60);

    pendingGuestServerSaveRef.current = null;
    onlineManager.leaveRoom();
    await closeHostSession();
    await reloadFreshMap();

    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) {
      setLoadingScreen(prev => ({ ...prev, isOpen: false }));
      return;
    }

    resetSessionStats();
    lastAppliedWorldSyncRef.current = 0;

    activeWorldRef.current = {
      worldId: serverWorldId,
      worldName: opts.serverName || `Сервер ${cleanCode}`,
      origin: 'server',
      serverRoomCode: cleanCode,
      serverName: opts.serverName || `Сервер ${cleanCode}`
    };

    if (existingServerSave) {
      applySavedStateToWorld(existingServerSave, world, player, camera);
    } else {
      resetAllWorldSingletons(world);
      const spawnLoc = SPAWN_LOCATIONS[0];
      resetPlayerToFreshState(player, spawnLoc);
      setIsInVehicle(false);
      setActiveCarName('');
      sound.stopEngine();

      const initialCal = createInitialCalendarState(2026, 10, 8, 12.0);
      calendarRef.current = initialCal;
      setCalendar(initialCal);
      setTimeHour(12.0);
      timeHourRef.current = 12.0;
      setWeather('clear');
      weatherRef.current = 'clear';
      world.calendar = initialCal;
      world.season = initialCal.season;
      world.timeHour = 12.0;
      world.weather = 'clear';
      world.previousWeather = 'clear';
      world.weatherTransition = 1.0;
      Object.assign(world, getInitialSurfaceHydrologyForCalendar(initialCal, 'clear'));
      handleSetGpsTarget(null);

      world.gameMode = resolvedMode;
      camera.x = spawnLoc.x;
      camera.y = spawnLoc.y;
      camera.targetX = spawnLoc.x;
      camera.targetY = spawnLoc.y;
      camera.targetZoom = 1.15;
    }

    // Apply dedicated server traffic settings chosen by Host
    const serverTrafficOn = Boolean(opts.trafficEnabled);
    const serverVehCount = Math.max(0, opts.vehicleCount ?? 15);
    const serverPedCount = Math.max(0, opts.pedestrianCount ?? 10);
    aiTrafficOnRef.current = serverTrafficOn;
    setIsAiTrafficOn(serverTrafficOn);
    performanceConfig.nearbyVehiclesTarget = serverVehCount;
    performanceConfig.maxVehicles = Math.max(12, serverVehCount * 2);
    performanceConfig.maxActivePedestrians = serverPedCount;
    if (!serverTrafficOn) {
      world.pedestrians = [];
      world.vehicles = world.vehicles.filter(
        (v) =>
          v.isPlayerControlled || (v as any).isRemoteControlled || v.isParked || v.isDerelict ||
          (v as any).playerOwned || (v as any).isSpawnedByPlayer || v.ownerId === 'player' ||
          Boolean(v.keyId) || v.id === 'evac_ambulance_special'
      );
      setTrafficCount(world.vehicles.length);
    }

    setLoadingScreen(prev => ({
      ...prev,
      stepText: resolvedAccess === 'code'
        ? `Открытие приватной комнаты ${cleanCode}...`
        : 'Регистрация комнаты в каталоге серверов...',
      progress: 80
    }));

    await openHostSession({
      access: resolvedAccess,
      roomCode: cleanCode,
      serverName: opts.serverName,
      mapName: 'flatbody',
      gameMode: opts.gameMode,
      maxPlayers: opts.maxPlayers,
      nickname: opts.nickname,
      trafficEnabled: opts.trafficEnabled,
      vehicleCount: opts.vehicleCount,
      pedestrianCount: opts.pedestrianCount,
      passwordRequired: opts.passwordRequired,
      savePlayerData: opts.savePlayerData,
      antiCheat: opts.antiCheat
    });

    if (opts.savePlayerData && !existingServerSave) {
      handleCreateSave(opts.serverName || `Сервер ${cleanCode}`);
    }

    // Immediately register initial server backup in DB so the host can see & re-launch it later
    void persistActiveHostedServer();

    const authTag = opts.passwordRequired ? ' · защита ников вкл.' : '';
    addPlayerNotification(player, `Сервер «${opts.serverName}» запущен (код: ${cleanCode}${authTag})`, 'info');
    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
    await waitMs(160);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  /**
   * Builds a compact, Firestore-friendly snapshot of the hosted world & host player state
   * compatible with applySavedStateToWorld().
   */
  const buildHostWorldStateSnapshot = (): Record<string, any> | null => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return null;

    const currentStreet = findStreetNameAtPosition(world, player.x, player.y);
    const currentCal = calendarRef.current;

    const keyedVehicleIds = new Set<string>();
    const scanKey = (item: any) => {
      if (!item) return;
      if (item.vehicleId) keyedVehicleIds.add(item.vehicleId);
      if (Array.isArray(item.contents)) item.contents.forEach(scanKey);
    };
    player.inventory?.forEach(scanKey);
    scanKey((player as any).leftHandItem);
    scanKey((player as any).rightHandItem);
    if (player.equippedClothing) {
      Object.values(player.equippedClothing).forEach(scanKey);
    }
    if (player.currentVehicleId) keyedVehicleIds.add(player.currentVehicleId);

    const savedVehicles = (world.vehicles || [])
      .filter((v) =>
        !(v as any).isRemoteControlled && (
          keyedVehicleIds.has(v.id) ||
          v.ownerId === 'player' ||
          (v as any).playerOwned ||
          (v as any).isSpawnedByPlayer ||
          Boolean(v.keyId) ||
          v.id === player.currentVehicleId ||
          Boolean(v.trailerId) ||
          Boolean(v.towedById)
        )
      )
      .slice(0, 25)
      .map((v) => ({
        id: v.id,
        keyId: v.keyId,
        keyTier: v.keyTier,
        insertedKeyType: v.insertedKeyType,
        insertedKeyId: v.insertedKeyId,
        ownerId: v.ownerId || 'player',
        playerOwned: (v as any).playerOwned ?? (v.ownerId === 'player'),
        isSpawnedByPlayer: (v as any).isSpawnedByPlayer ?? (v.ownerId === 'player'),
        isLocked: Boolean(v.isLocked),
        type: v.type,
        x: v.x,
        y: v.y,
        angle: v.angle,
        speed: 0,
        color: v.color,
        roofColor: v.roofColor,
        hasGBO: v.hasGBO,
        hasRearviewCamera: v.hasRearviewCamera,
        hasHeavySuspension: (v as any).hasHeavySuspension,
        hasChiptuning: (v as any).hasChiptuning,
        fuelSystem: v.fuelSystem ? JSON.parse(JSON.stringify(v.fuelSystem)) : undefined,
        engineState: v.engineState ? JSON.parse(JSON.stringify(v.engineState)) : undefined,
        isParked: v.isParked,
        isDerelict: v.isDerelict,
        windowOpen: v.windowOpen,
        headlightsOn: v.headlightsOn,
        headlightMode: v.headlightMode,
        trailerId: v.trailerId,
        towedById: v.towedById
      }));

    return {
      mode: world.gameMode || 'career',
      playerX: player.x,
      playerY: player.y,
      playerAngle: player.angle,
      isInVehicle: player.isInVehicle,
      currentVehicleId: player.currentVehicleId,
      timeHour: timeHourRef.current,
      calendar: { ...currentCal },
      season: currentCal.season,
      weather: weatherRef.current,
      streetName: currentStreet,
      needs: player.needs ? JSON.parse(JSON.stringify(player.needs)) : undefined,
      bodyState: player.bodyState ? JSON.parse(JSON.stringify(player.bodyState)) : undefined,
      inventory: player.inventory ? JSON.parse(JSON.stringify(player.inventory)).slice(0, 120) : [],
      equippedClothing: player.equippedClothing ? JSON.parse(JSON.stringify(player.equippedClothing)) : undefined,
      leftHandItem: player.leftHandItem ? JSON.parse(JSON.stringify(player.leftHandItem)) : null,
      rightHandItem: player.rightHandItem ? JSON.parse(JSON.stringify(player.rightHandItem)) : null,
      activeHand: player.activeHand || 'right',
      cash: getPlayerCash(player),
      selectedHotbarIndex: player.selectedHotbarIndex || 0,
      vehicles: savedVehicles,
      isInsideBuilding: player.isInsideBuilding || false,
      insideBuildingId: player.insideBuildingId || null,
      isInsideApartment: player.isInsideApartment || false,
      insideApartmentId: player.insideApartmentId || null,
      currentFloor: player.currentFloor || 0
    };
  };

  /**
   * Saves the currently hosted dedicated server (world state, accounts + password hashes, bans, mutes, guest saves)
   * to Firestore (`hosted_servers`) + local backup cache.
   */
  const persistActiveHostedServer = async (): Promise<boolean> => {
    if (!onlineManager.isHost || !onlineManager.roomCode) return false;
    if (activeWorldRef.current.origin !== 'server') return false;

    const hs = getHostSession();
    const cleanCode = onlineManager.roomCode;
    const srvState = onlineManager.exportServerState(cleanCode);
    const hostWorldState = buildHostWorldStateSnapshot();

    const res = await saveHostedServerBackup({
      hostUid: auth.currentUser?.uid || 'local',
      hostName: onlineManager.localPlayerName || 'Хост',
      roomCode: cleanCode,
      serverName: hs?.serverName || onlineManager.serverDisplayName || activeWorldRef.current.serverName || `Сервер ${cleanCode}`,
      mapName: hs?.mapName || 'flatbody',
      gameMode: hs?.gameMode || (worldRef.current?.gameMode === 'freeroam' ? 'free_roam' : 'street_race'),
      access: hs?.access || 'all',
      maxPlayers: hs?.maxPlayers || 8,
      trafficEnabled: onlineManager.serverSettings.trafficEnabled,
      vehicleCount: onlineManager.serverSettings.vehicleCount,
      pedestrianCount: onlineManager.serverSettings.pedestrianCount,
      passwordRequired: onlineManager.serverSettings.passwordRequired,
      savePlayerData: onlineManager.serverSettings.savePlayerData,
      antiCheat: onlineManager.serverSettings.antiCheat,
      accounts: srvState.accounts,
      bans: srvState.bans,
      mutes: srvState.mutes,
      playerSaves: srvState.playerSaves,
      hostWorldState
    });
    return res.savedToCloud;
  };

  /**
   * Re-launches a previously saved server from the DB ("Мои серверы"),
   * restoring its world, all registered player accounts/passwords, bans, mutes, and player saves.
   */
  const handleStartSavedServer = async (backup: HostedServerBackup) => {
    const cleanCode = onlineManager.sanitizeRoomCode(backup.roomCode);
    if (!cleanCode) return;

    const resolvedAccess: HostAccess = backup.access === 'code' ? 'code' : 'all';
    const resolvedMode: 'career' | 'freeroam' =
      (backup.hostWorldState?.mode === 'freeroam' || backup.hostWorldState?.mode === 'career')
        ? backup.hostWorldState.mode
        : (backup.gameMode === 'free_roam' || backup.gameMode === 'drift' ? 'freeroam' : 'career');
    const serverWorldId = `server_${cleanCode}`;

    setLoadingScreen({
      isOpen: true,
      actionType: 'load_save',
      title: backup.serverName || `Сервер ${cleanCode}`,
      subtitle: 'Запуск сохранённого сервера из БД',
      stepText: 'Восстановление мира, аккаунтов, паролей и банов...',
      progress: 28,
      mode: resolvedMode,
      locationName: backup.hostWorldState?.streetName || 'Центр города',
      timeHour: backup.hostWorldState?.timeHour ?? 12,
      weather: backup.hostWorldState?.weather || 'clear'
    });

    await waitMs(60);

    pendingGuestServerSaveRef.current = null;
    onlineManager.leaveRoom();
    await closeHostSession();
    await reloadFreshMap();

    const world = worldRef.current;
    const player = playerRef.current;
    const camera = cameraRef.current;
    if (!world || !player) {
      setLoadingScreen(prev => ({ ...prev, isOpen: false }));
      return;
    }

    resetSessionStats();
    lastAppliedWorldSyncRef.current = 0;

    activeWorldRef.current = {
      worldId: serverWorldId,
      worldName: backup.serverName || `Сервер ${cleanCode}`,
      origin: 'server',
      serverRoomCode: cleanCode,
      serverName: backup.serverName || `Сервер ${cleanCode}`
    };

    // Import all persisted server accounts (salted hashes), bans, mutes, and guest saves BEFORE opening the room
    onlineManager.importServerState(cleanCode, {
      accounts: backup.accounts || {},
      bans: backup.bans || {},
      mutes: backup.mutes || {},
      playerSaves: backup.playerSaves || {}
    });

    if (backup.hostWorldState) {
      applySavedStateToWorld(backup.hostWorldState, world, player, camera);
    } else {
      const localExisting = savesRef.current.find(s => s.worldId === serverWorldId && s.origin === 'server');
      if (localExisting) {
        applySavedStateToWorld(localExisting, world, player, camera);
      } else {
        resetAllWorldSingletons(world);
        const spawnLoc = SPAWN_LOCATIONS[0];
        resetPlayerToFreshState(player, spawnLoc);
        setIsInVehicle(false);
        setActiveCarName('');
        sound.stopEngine();
        world.gameMode = resolvedMode;
        camera.x = spawnLoc.x;
        camera.y = spawnLoc.y;
        camera.targetX = spawnLoc.x;
        camera.targetY = spawnLoc.y;
        camera.targetZoom = 1.15;
      }
    }

    // Apply saved dedicated server traffic configuration
    const restoredTrafficOn = backup.trafficEnabled ?? true;
    const restoredVehCount = Math.max(0, backup.vehicleCount ?? 15);
    const restoredPedCount = Math.max(0, backup.pedestrianCount ?? 10);
    aiTrafficOnRef.current = restoredTrafficOn;
    setIsAiTrafficOn(restoredTrafficOn);
    performanceConfig.nearbyVehiclesTarget = restoredVehCount;
    performanceConfig.maxVehicles = Math.max(12, restoredVehCount * 2);
    performanceConfig.maxActivePedestrians = restoredPedCount;
    if (!restoredTrafficOn) {
      world.pedestrians = [];
      world.vehicles = world.vehicles.filter(
        (v) =>
          v.isPlayerControlled || (v as any).isRemoteControlled || v.isParked || v.isDerelict ||
          (v as any).playerOwned || (v as any).isSpawnedByPlayer || v.ownerId === 'player' ||
          Boolean(v.keyId) || v.id === 'evac_ambulance_special'
      );
      setTrafficCount(world.vehicles.length);
    }

    setLoadingScreen(prev => ({
      ...prev,
      stepText: resolvedAccess === 'code'
        ? `Включение приватного сервера ${cleanCode}...`
        : 'Включение и публикация сервера...',
      progress: 82
    }));

    await openHostSession({
      access: resolvedAccess,
      roomCode: cleanCode,
      serverName: backup.serverName,
      mapName: backup.mapName || 'flatbody',
      gameMode: backup.gameMode || 'free_roam',
      maxPlayers: backup.maxPlayers || 8,
      nickname: onlineManager.localPlayerName || backup.hostName || 'Хост',
      trafficEnabled: backup.trafficEnabled ?? true,
      vehicleCount: backup.vehicleCount ?? 15,
      pedestrianCount: backup.pedestrianCount ?? 10,
      passwordRequired: Boolean(backup.passwordRequired),
      savePlayerData: backup.savePlayerData !== false,
      antiCheat: backup.antiCheat || 'moderate'
    });

    const accCount = Object.keys(backup.accounts || {}).length;
    const banCount = Object.keys(backup.bans || {}).length;
    addPlayerNotification(
      player,
      `Сервер «${backup.serverName}» включён (аккаунтов: ${accCount}, банов: ${banCount})`,
      'info'
    );
    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
    await waitMs(160);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  // Wire OnlineManager callbacks for host /save, /tp, /tphere, and server-side guest save restoration
  useEffect(() => {
    onlineManager.onHostSaveRequested = async () => {
      return await persistActiveHostedServer();
    };
    onlineManager.onHostTeleportSelf = (x: number, y: number) => {
      const p = playerRef.current;
      const w = worldRef.current;
      const cam = cameraRef.current;
      if (!p || !w) return;
      if (p.isInVehicle && p.currentVehicleId) {
        const veh = w.vehicles.find((v) => v.id === p.currentVehicleId);
        if (veh) {
          veh.x = x + 36;
          veh.y = y;
          veh.vx = 0;
          veh.vy = 0;
          veh.speed = 0;
        }
      }
      p.x = x + 36;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      if (cam) {
        cam.x = p.x;
        cam.y = p.y;
        cam.targetX = p.x;
        cam.targetY = p.y;
      }
    };
    onlineManager.onGuestTeleported = (x: number, y: number, reason?: string) => {
      const p = playerRef.current;
      const w = worldRef.current;
      const cam = cameraRef.current;
      if (!p || !w) return;
      if (p.isInVehicle && p.currentVehicleId) {
        const veh = w.vehicles.find((v) => v.id === p.currentVehicleId);
        if (veh) {
          veh.x = x;
          veh.y = y;
          veh.vx = 0;
          veh.vy = 0;
          veh.speed = 0;
        }
      }
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      if (cam) {
        cam.x = p.x;
        cam.y = p.y;
        cam.targetX = p.x;
        cam.targetY = p.y;
      }
      if (reason) addPlayerNotification(p, reason, 'info');
    };
    onlineManager.onGuestServerSaveReceived = (srvSave: ServerPlayerSaveRecord) => {
      const p = playerRef.current;
      const cam = cameraRef.current;
      if (!p || !srvSave) return;
      pendingGuestServerSaveRef.current = null;
      if (typeof srvSave.x === 'number' && typeof srvSave.y === 'number') {
        p.x = srvSave.x;
        p.y = srvSave.y;
        p.angle = srvSave.angle || 0;
        p.vx = 0;
        p.vy = 0;
        if (cam) {
          cam.x = p.x;
          cam.y = p.y;
          cam.targetX = p.x;
          cam.targetY = p.y;
        }
      }
      if (typeof srvSave.cash === 'number') p.cash = srvSave.cash;
      if (Array.isArray(srvSave.inventory)) p.inventory = JSON.parse(JSON.stringify(srvSave.inventory));
      if (srvSave.equippedClothing) p.equippedClothing = JSON.parse(JSON.stringify(srvSave.equippedClothing));
      if (srvSave.leftHandItem !== undefined) p.leftHandItem = srvSave.leftHandItem ? JSON.parse(JSON.stringify(srvSave.leftHandItem)) : null;
      if (srvSave.rightHandItem !== undefined) p.rightHandItem = srvSave.rightHandItem ? JSON.parse(JSON.stringify(srvSave.rightHandItem)) : null;
      if (srvSave.activeHand) p.activeHand = srvSave.activeHand;
      if (srvSave.needs && p.needs) p.needs = { ...p.needs, ...srvSave.needs };
      if (srvSave.bodyState && p.bodyState) p.bodyState = JSON.parse(JSON.stringify(srvSave.bodyState));
      setVitalsRefreshTick((t) => t + 1);
      addPlayerNotification(p, 'Профиль игрока восстановлен из базы данных сервера', 'info');
    };

    const handleBeforeUnloadServerBackup = () => {
      if (onlineManager.isHost && onlineManager.roomCode && activeWorldRef.current.origin === 'server') {
        void persistActiveHostedServer();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnloadServerBackup);
    window.addEventListener('pagehide', handleBeforeUnloadServerBackup);

    // Periodic host DB autosave (every 60s) and guest profile upload to host (every 20s)
    const hostSaveTimer = window.setInterval(() => {
      if (onlineManager.status === 'connected' && onlineManager.isHost && activeWorldRef.current.origin === 'server') {
        void persistActiveHostedServer();
      }
    }, 60_000);

    const guestUploadTimer = window.setInterval(() => {
      if (
        onlineManager.status === 'connected' &&
        !onlineManager.isHost &&
        onlineManager.authState === 'authenticated' &&
        onlineManager.serverSettings.savePlayerData !== false &&
        playerRef.current
      ) {
        const p = playerRef.current;
        const w = worldRef.current;
        const curVeh = p.isInVehicle && p.currentVehicleId ? w?.vehicles.find((v) => v.id === p.currentVehicleId) : null;
        onlineManager.uploadLocalServerSave({
          nickname: onlineManager.localPlayerName,
          cash: getPlayerCash(p),
          x: p.x,
          y: p.y,
          angle: p.angle,
          isInVehicle: p.isInVehicle,
          vehicleType: curVeh?.type || null,
          vehicleColor: curVeh?.color || null,
          inventory: p.inventory ? JSON.parse(JSON.stringify(p.inventory)).slice(0, 80) : [],
          equippedClothing: p.equippedClothing ? JSON.parse(JSON.stringify(p.equippedClothing)) : undefined,
          leftHandItem: p.leftHandItem ? JSON.parse(JSON.stringify(p.leftHandItem)) : null,
          rightHandItem: p.rightHandItem ? JSON.parse(JSON.stringify(p.rightHandItem)) : null,
          activeHand: p.activeHand || 'right',
          needs: p.needs ? JSON.parse(JSON.stringify(p.needs)) : undefined,
          bodyState: p.bodyState ? JSON.parse(JSON.stringify(p.bodyState)) : undefined
        });
      }
    }, 20_000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnloadServerBackup);
      window.removeEventListener('pagehide', handleBeforeUnloadServerBackup);
      window.clearInterval(hostSaveTimer);
      window.clearInterval(guestUploadTimer);
    };
  }, []);

  // Apply the guest's local server save ONLY after the host confirms authentication
  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      const pending = pendingGuestServerSaveRef.current;
      if (!pending) return;
      if (onlineManager.isHost) {
        pendingGuestServerSaveRef.current = null;
        return;
      }
      if (onlineManager.authState === 'kicked') {
        pendingGuestServerSaveRef.current = null;
        return;
      }
      if (onlineManager.authState === 'authenticated' && onlineManager.roomCode === pending.roomCode) {
        pendingGuestServerSaveRef.current = null;
        if (onlineManager.serverSettings.savePlayerData === false) return;
        const world = worldRef.current;
        const player = playerRef.current;
        const camera = cameraRef.current;
        if (!world || !player || !camera) return;

        let saved = savesRef.current.find(
          s => s.worldId === pending.serverWorldId && s.origin === 'server'
        );
        // Only fall back to legacy un-scoped server save if server has no per-nick password protection
        if (!saved && !onlineManager.serverSettings.passwordRequired) {
          saved = savesRef.current.find(
            s => s.worldId === pending.legacyWorldId && s.origin === 'server'
          );
        }
        if (saved) {
          applySavedStateToWorld(saved, world, player, camera);
          addPlayerNotification(player, `Загружен ваш профиль на сервере ${pending.roomCode}`, 'info');
        }
      }
    });
    return () => { unsub(); };
  }, []);

  const handleExitToMainMenu = async () => {
    const p = playerRef.current;
    const w = worldRef.current;
    const curStreet = w && p ? findStreetNameAtPosition(w, p.x, p.y) : 'flatbody';
    const isStoppingHostedServer =
      onlineManager.isHost && Boolean(onlineManager.roomCode) && activeWorldRef.current.origin === 'server';
    const isAuthenticatedGuest =
      !onlineManager.isHost &&
      onlineManager.status === 'connected' &&
      onlineManager.authState === 'authenticated';

    pendingGuestServerSaveRef.current = null;
    onlineManager.clearAuthKick();
    setIsPauseMenuOpen(false);
    setLoadingScreen({
      isOpen: true,
      actionType: 'exit_menu',
      title: isStoppingHostedServer ? 'Остановка сервера' : 'Выход в главное меню',
      subtitle: isStoppingHostedServer
        ? 'Сохранение мира, аккаунтов, паролей, банов и профилей игроков в БД'
        : 'Завершение текущей сессии',
      stepText: isStoppingHostedServer
        ? 'Сохранение данных сервера в базу данных...'
        : 'Сохранение параметров и выгрузка сессии...',
      progress: 30,
      mode: w?.gameMode || 'career',
      locationName: curStreet,
      timeHour: timeHourRef.current,
      weather: weatherRef.current
    });
    sound.stopEngine();
    sound.stopTireScreech();
    sound.stopHorn();

    // If guest is leaving an online server, push one final profile snapshot to the host
    if (isAuthenticatedGuest && p && onlineManager.serverSettings.savePlayerData !== false) {
      const curVeh = p.isInVehicle && p.currentVehicleId ? w?.vehicles.find((v) => v.id === p.currentVehicleId) : null;
      onlineManager.uploadLocalServerSave({
        nickname: onlineManager.localPlayerName,
        cash: getPlayerCash(p),
        x: p.x,
        y: p.y,
        angle: p.angle,
        isInVehicle: p.isInVehicle,
        vehicleType: curVeh?.type || null,
        vehicleColor: curVeh?.color || null,
        inventory: p.inventory ? JSON.parse(JSON.stringify(p.inventory)).slice(0, 80) : [],
        equippedClothing: p.equippedClothing ? JSON.parse(JSON.stringify(p.equippedClothing)) : undefined,
        leftHandItem: p.leftHandItem ? JSON.parse(JSON.stringify(p.leftHandItem)) : null,
        rightHandItem: p.rightHandItem ? JSON.parse(JSON.stringify(p.rightHandItem)) : null,
        activeHand: p.activeHand || 'right',
        needs: p.needs ? JSON.parse(JSON.stringify(p.needs)) : undefined,
        bodyState: p.bodyState ? JSON.parse(JSON.stringify(p.bodyState)) : undefined
      });
    }

    // If host is stopping a hosted server, persist all server data to Firestore DB BEFORE tearing down the room
    if (isStoppingHostedServer) {
      await persistActiveHostedServer();
      setLoadingScreen(prev => ({
        ...prev,
        stepText: 'Сервер сохранён в БД. Закрытие комнаты...',
        progress: 65
      }));
    }

    await waitMs(60);
    onlineManager.leaveRoom();
    await closeHostSession();
    resetSessionStats();
    await reloadFreshMap();
    if (worldRef.current) {
      resetAllWorldSingletons(worldRef.current);
    }
    if (playerRef.current) {
      resetPlayerToFreshState(playerRef.current, SPAWN_LOCATIONS[0]);
    }
    activeWorldRef.current = {
      worldId: `world_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      worldName: 'flatbody',
      origin: 'singleplayer'
    };
    setLoadingScreen(prev => ({
      ...prev,
      stepText: 'Открытие главного меню...',
      progress: 100
    }));
    setMainMenuInitialScreen('main');
    setIsMainMenuOpen(true);
    await waitMs(140);
    setLoadingScreen(prev => ({ ...prev, isOpen: false }));
  };

  const getMouseWorldPos = (sx: number, sy: number) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;

    // 1. Shift by screen center
    let dx = sx - window.innerWidth / 2;
    let dy = sy - window.innerHeight / 2;

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

  const worldToScreen = (wx: number, wy: number) => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;

    // 1. Forward translate (world to relative)
    const dx = wx - camera.x;
    const dy = wy - camera.y;

    // 2. Forward rotate (-camera.angle - Math.PI / 2)
    const angle = -camera.angle - Math.PI / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    // 3. Forward scale
    const sx = rx * camera.zoom;
    const sy = ry * camera.zoom;

    // 4. Shift by screen center
    const rect = canvas.getBoundingClientRect();
    return {
      x: sx + rect.width / 2 + rect.left,
      y: sy + rect.height / 2 + rect.top
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
      const config = CAR_CONFIGS[placement.id] || CAR_CONFIGS[placement.id.toLowerCase()] || CAR_CONFIGS.sedan;
      const fs = createDefaultFuelSystem(placement.id as any, false);
      const keyId = `key_spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newVehicle: Vehicle = {
        id: `spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        type: (config.type || placement.id) as any,
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
        hasGBO: ['sedan_classic', 'wagon_classic', 'taxi_yellow', 'delivery_truck', 'van_cargo_old'].includes(placement.id) ? Math.random() < 0.4 : false,
        engineState: createDefaultEngineState((config.type || placement.id) as any, false, false),
        fuelSystem: fs,
        damage: createDefaultVehicleDamage(config.length, config.width),
        isPlayerControlled: false,
        isParked: true,
        isLocked: false,
        ownerId: 'player',
        keyId: keyId,
        insertedKeyType: 'car_key',
        insertedKeyId: keyId,
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
      (newVehicle as any).isSpawnedByPlayer = true;
      (newVehicle as any).playerOwned = true;
      applyPowertrain(newVehicle);
      world.vehicles.push(newVehicle);
      spatialGridVehiclesRef.current.insert(newVehicle);

      // Issue player a matching key
      const carKeyItem = createItem('car_key', 1);
      carKeyItem.nameRu = `Ключ (${config.name})`;
      (carKeyItem as any).carKeyId = keyId;
      (carKeyItem as any).vehicleId = newVehicle.id;
      addItemToPlayer(player, carKeyItem);

      sound.resume();
      addPlayerNotification(player, `Автомобиль ${placement.nameRu} установлен! Ключ в инвентаре.`, 'info');
      addPlayerNotification(player, newVehicle.powertrainLabel || describePowertrain(newVehicle), 'info');
      setActivePlacement(null);
      activePlacementRef.current = null;
    } else if (placement.type === 'prop') {
      const isHighwayCam = placement.id === 'lamp_highway_camera';
      const isCctvPole = placement.id === 'cctv_pole';
      const actualType = isHighwayCam ? 'lamp_highway' : placement.id;
      const newProp: StreetProp = {
        id: `spawn_prop_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        x: mouseWorldPos.x,
        y: mouseWorldPos.y,
        type: actualType as any,
        angle: placement.angle,
        isBroken: false,
        ...(actualType === 'lamp_highway'
          ? {
              lampStyle: 'galvanized_octagonal' as const,
              bulbType: 'led_cool' as const,
              armType: 'single' as const,
              hasJunctionBox: true,
              hasReflectiveStripes: true,
              poleNumber: `М-${Math.floor(100 + Math.random() * 899)}`
            }
          : {}),
        ...(actualType === 'lamp_concrete'
          ? {
              lampStyle: 'sv95_soviet' as const,
              bulbType: 'sodium_dnat' as const,
              hasWarningSign: true,
              wearLevel: 0.45,
              poleNumber: `Б-${Math.floor(100 + Math.random() * 899)}`
            }
          : {}),
        ...(actualType === 'lamp'
          ? {
              lampStyle: 'cast_iron_classic' as const,
              bulbType: 'tungsten_warm' as const,
              poleNumber: `П-${Math.floor(100 + Math.random() * 899)}`
            }
          : {}),
        ...(isHighwayCam || isCctvPole
          ? {
              hasCamera: true,
              cameraType: isHighwayCam ? ('dome_ptz' as const) : ('bullet_ir' as const),
              cameraAngle: placement.angle,
              cameraFov: isHighwayCam ? 1.55 : 1.25,
              cameraRange: isHighwayCam ? 225 : 210,
              hasCameraFloodlight: true,
              cameraFloodlightHoldSec: 60,
              hasJunctionBox: true,
              hasReflectiveStripes: true,
              poleNumber: `К-${Math.floor(10 + Math.random() * 89)}`
            }
          : {})
      };
      world.props.push(newProp);
      spatialGridPropsRef.current.insert(newProp);
      addPlayerNotification(player, `Проп ${placement.nameRu} установлен!`, 'info');
      setActivePlacement(null);
      activePlacementRef.current = null;
    }
  };

  const handleSpawnVehicleDirectly = (carType: string, color: string, autoEnter: boolean = false) => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return;
    const config = CAR_CONFIGS[carType] || CAR_CONFIGS[carType.toLowerCase()] || CAR_CONFIGS.sedan;

    // Clear any active placement mode
    setActivePlacement(null);
    activePlacementRef.current = null;

    const angle = player.isInVehicle ? (player.currentVehicleId ? (world.vehicles.find(v => v.id === player.currentVehicleId)?.angle || 0) : 0) : (player.angle || 0);
    const spawnDist = autoEnter ? 0 : 110;
    const spawnX = autoEnter ? player.x : player.x + Math.cos(angle) * spawnDist;
    const spawnY = autoEnter ? player.y : player.y + Math.sin(angle) * spawnDist;

    const fs = createDefaultFuelSystem((config.type || carType) as any, false);
    const keyId = `key_spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newVehicle: Vehicle = {
      id: `spawn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type: (config.type || carType) as any,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: angle,
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
      color: color || '#c68a35',
      roofColor: color || '#c68a35',
      headlightsOn: false,
      headlightMode: 'off',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      requiredFuel: fs.fuelType === 'diesel' ? 'diesel' : (fs.octaneNumber === 92 ? 'ai92' : 'ai95'),
      hasGBO: ['sedan_classic', 'wagon_classic', 'taxi_yellow', 'delivery_truck', 'van_cargo_old'].includes(carType) ? Math.random() < 0.4 : false,
      engineState: createDefaultEngineState((config.type || carType) as any, autoEnter, false),
      fuelSystem: fs,
      damage: createDefaultVehicleDamage(config.length, config.width),
      isPlayerControlled: autoEnter,
      isParked: !autoEnter,
      isLocked: false,
      ownerId: 'player',
      keyId: keyId,
      insertedKeyType: 'car_key',
      insertedKeyId: keyId,
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
    (newVehicle as any).isSpawnedByPlayer = true;
    (newVehicle as any).playerOwned = true;
    applyPowertrain(newVehicle);

    world.vehicles.push(newVehicle);
    spatialGridVehiclesRef.current.insert(newVehicle);

    // Give matching key to player
    const carKeyItem = createItem('car_key', 1);
    carKeyItem.nameRu = `Ключ (${config.name})`;
    (carKeyItem as any).carKeyId = keyId;
    (carKeyItem as any).vehicleId = newVehicle.id;
    addItemToPlayer(player, carKeyItem);

    if (autoEnter) {
      if (player.isInVehicle && player.currentVehicleId) {
        const oldV = world.vehicles.find(v => v.id === player.currentVehicleId);
        if (oldV) {
          oldV.isPlayerControlled = false;
          oldV.isParked = true;
        }
      }
      player.isInVehicle = true;
      player.currentVehicleId = newVehicle.id;
      player.x = newVehicle.x;
      player.y = newVehicle.y;
      player.angle = newVehicle.angle;
      setIsInVehicle(true);
      setActiveCarName(config.name);
      sound.playCarDoor();
      addPlayerNotification(player, `Вы сели за руль ${config.name}! Ключ в замке зажигания.`, 'pickup');
      addPlayerNotification(player, newVehicle.powertrainLabel || describePowertrain(newVehicle), 'info');
    } else {
      sound.playHorn();
      addPlayerNotification(player, `Транспорт ${config.name} заспавнен рядом! Ключ в инвентаре.`, 'pickup');
      addPlayerNotification(player, newVehicle.powertrainLabel || describePowertrain(newVehicle), 'info');
    }
  };

  // Periodic autosave based on settings.autoSaveInterval (scoped strictly to active worldId)
  useEffect(() => {
    if (settings.autoSaveInterval <= 0) return;
    const interval = setInterval(() => {
      if (worldRef.current && playerRef.current && !isMainMenuOpenRef.current && !isPauseMenuOpenRef.current) {
        handleCreateSave('Автосохранение', { isAutosave: true });
      }
    }, settings.autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoSaveInterval]);

  // Clean up remote players' ghost vehicles whenever online session disconnects
  useEffect(() => {
    if (onlineStatus === 'disconnected') {
      onlineManager.clearRemoteVehiclesFromWorld(worldRef.current);
    }
  }, [onlineStatus]);

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
    brakeLeft: false,
    brakeRight: false,
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
    transferCaseToggle: false,
    diffLockToggle: false,
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
  const telemetryTimerRef = useRef<number>(0);
  const lastFpsUiRef = useRef<number>(60);
  const lastTimeMinuteRef = useRef<number>(-1);
  const lastWeatherTransStepRef = useRef<number>(-1);
  const lastStreetPosRef = useRef<{ x: number; y: number }>({ x: -99999, y: -99999 });
  const hudTickAccumRef = useRef<number>(0);
  const prevCanExitBldRef = useRef<boolean>(false);
  const prevCanEnterBldIdRef = useRef<string | null>(null);
  const prevCanRepairRef = useRef<boolean>(false);
  const prevNearShopSigRef = useRef<string>('');
  const prevActiveElevSigRef = useRef<string>('');
  const scratchVpBuildingsRef = useRef<Building[]>([]);
  const scratchVpVehiclesRef = useRef<Vehicle[]>([]);
  const scratchVpPedestriansRef = useRef<Pedestrian[]>([]);
  const scratchVpTreesRef = useRef<Tree[]>([]);
  const scratchVpPropsRef = useRef<StreetProp[]>([]);
  const scratchVpSidewalksRef = useRef<SidewalkBlock[]>([]);

  // Initialize Game World (Runs ONCE on mount, NEVER resets when toggling day/night)
  useEffect(() => {
    let isMounted = true;
    let animationFrameId: number = 0;
    let cleanupListeners: (() => void) | null = null;

    sound.init();
    loadMap()
      .catch((err) => {
        console.error('[App] Ошибка загрузки карты из map.json:', err);
        return null;
      })
      .then((world) => {
        if (!world) return;
        if (!isMounted) return;
        ensureWorldSurfaceHydrology(world);
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

      // GPU shader layer (bloom, grading, upscale, AA) is initialized lazily only when enabled.
      const gpuCanvas = gpuCanvasRef.current;
      let gpuFxUnavailable = false;
      const syncGpuFxLifecycle = () => {
        if (!gpuCanvas) return null;
        if (!performanceConfig.enableGpuPostFx) {
          if (gpuFxRef.current) {
            gpuFxRef.current.dispose();
            gpuFxRef.current = null;
          }
          gpuCanvas.style.display = 'none';
          return null;
        }
        if (!gpuFxRef.current && !gpuFxUnavailable) {
          const fx = new GpuPostFx(canvas, gpuCanvas);
          if (fx.available) {
            gpuFxRef.current = fx;
            const cssW = window.innerWidth;
            const cssH = window.innerHeight;
            const mobile = isMobileOrLowEndDevice();
            const dpr = performanceConfig.hiDpi ? Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2) : 1;
            fx.resize(cssW * dpr, cssH * dpr);
            gpuCanvas.style.width = cssW + 'px';
            gpuCanvas.style.height = cssH + 'px';
          } else {
            fx.dispose();
            gpuFxUnavailable = true;
            gpuCanvas.style.display = 'none';
          }
        }
        return gpuFxRef.current;
      };
      if (performanceConfig.enableGpuPostFx) {
        syncGpuFxLifecycle();
      } else if (gpuCanvas) {
        gpuFxRef.current?.dispose();
        gpuFxRef.current = null;
        gpuCanvas.style.display = 'none';
      }

      // --- HYPER-EFFICIENT BACKGROUND HIBERNATION ---
      // When user switches tabs, focuses studio chat, or minimizes window,
      // hibernate heavy canvas rendering, pause engine audio and throttle loop to 0-2 FPS.
      let isWindowHibernated = false;
      let lastHibernationTick = 0;

      const clearAllHeldInputs = () => {
        const inp = inputRef.current;
        inp.forward = false;
        inp.backward = false;
        inp.left = false;
        inp.right = false;
        inp.handbrake = false;
        inp.sprint = false;
        inp.hornH = false;
        inp.isMouseDown = false;
        inp.craneBoomExtend = false;
        inp.craneBoomRetract = false;
        inp.craneHookUp = false;
        inp.craneHookDown = false;
        inp.exSlewLeft = false;
        inp.exSlewRight = false;
        inp.exBoomUp = false;
        inp.exBoomDown = false;
        inp.exStickOut = false;
        inp.exStickIn = false;
        inp.exBucketCurl = false;
        inp.exBucketDump = false;
        inp.exBladeUp = false;
        inp.exBladeDown = false;
        inp.exStabilizersUp = false;
        inp.exStabilizersDown = false;
      };

      const handleVisibilityChange = () => {
        if (typeof document === 'undefined') return;
        if (document.hidden) {
          isWindowHibernated = true;
          sound.purgeAudioGraph();
          // Release all active input keys so the player/car/excavator stops moving blindly
          clearAllHeldInputs();
        } else {
          isWindowHibernated = false;
          lastTime = performance.now();
        }
      };

      const handleWindowBlur = () => {
        // Stop car engines & screeching to save Web Audio thread CPU while user types elsewhere
        sound.stopEngine();
        sound.stopTireScreech();
        sound.stopHorn();
        clearAllHeldInputs();
      };

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);

      const handleResize = () => {
        if (!canvas || !rendererRef.current) return;
        const cssW = window.innerWidth;
        const cssH = window.innerHeight;
        const mobile = isMobileOrLowEndDevice();
        const outDpr = performanceConfig.hiDpi ? Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2) : 1;
        const scale = Math.min(1, Math.max(0.5, performanceConfig.renderScale)) * outDpr;
        canvas.width = Math.max(1, Math.round(cssW * scale));
        canvas.height = Math.max(1, Math.round(cssH * scale));
        canvas.style.width = cssW + 'px';
        canvas.style.height = cssH + 'px';
        rendererRef.current.resize(cssW, cssH, canvas.width / cssW);
        // Output keeps full display resolution even when the 2D render scale is lowered: the GPU layer upscales it
        const fx = gpuFxRef.current;
        const gpuCanvas = gpuCanvasRef.current;
        if (fx && gpuCanvas) {
          fx.resize(cssW * outDpr, cssH * outDpr);
          gpuCanvas.style.width = cssW + 'px';
          gpuCanvas.style.height = cssH + 'px';
        }
      };

      window.addEventListener('resize', handleResize);
      handleResize();

    // --- KEYBOARD & MOUSE INPUT LISTENERS ---
    const handleKeyDown = (e: KeyboardEvent) => {
      sound.resume();
      const code = e.code;

      // When typing in text input or textarea, or when chat is focused, skip game controls and allow Escape to blur
      const isTypingOrChatting =
        isChatFocusedRef.current ||
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        !!document.activeElement?.closest('#chat-overlay-container');

      if (isTypingOrChatting) {
        if (code === 'Escape') {
          (document.activeElement as HTMLElement)?.blur?.();
          setIsChatFocused(false);
          e.preventDefault();
        }
        return;
      }

      // Block all gameplay and pause hotkeys while server nickname auth / kick modal is active
      if (onlineManager.authChallenge || (onlineManager.authState === 'kicked' && onlineManager.authKickReason)) {
        return;
      }

      const m = modalStateRef.current;

      if (code === 'Escape') {
        if (isMainMenuOpenRef.current || isLoadingRef.current) {
          return;
        }
        if (m.isCrashDiagnosticsOpen) {
          setIsCrashDiagnosticsOpen(false);
          e.preventDefault();
          return;
        }
        if (activePlacementRef.current) {
          setActivePlacement(null);
          activePlacementRef.current = null;
          e.preventDefault();
          return;
        }
        if (isOnlineModalOpenRef.current) {
          setIsOnlineModalOpen(false);
          e.preventDefault();
          return;
        }
        if (activePhoneItemRef.current) {
          setActivePhoneItem(null);
          e.preventDefault();
          return;
        }
        if (m.isCreativeMode) {
          setIsCreativeMode(false);
          setIsFlying(false);
          setIsInvincible(false);
          setActivePlacement(null);
          activePlacementRef.current = null;
          e.preventDefault();
          return;
        }
        if (
          m.isInventoryOpen || m.isInspectionOpen || m.isConsoleOpen || m.isPerfConsoleOpen ||
          m.isFullMapOpen || m.isSpawnMenuOpen || m.isRadialMenuOpen || m.isVehicleBoardOpen ||
          m.isShopOpen || m.isDealershipOpen || m.isRealEstateModalOpen || m.isPropertyDocumentModalOpen ||
          m.isUserProfileModalOpen || m.isFriendsModalOpen || m.isDateTimePickerOpen ||
          m.isFurnitureStorageOpen || m.isGasStationCashierModalOpen || m.isEngineBayOpen ||
          m.isFuelNozzleModalOpen || m.isCraneOutriggersModalOpen || m.isVacuumPumpModalOpen ||
          m.hasActiveElevator
        ) {
          setIsInventoryOpen(false);
          setIsInspectionOpen(false);
          setIsConsoleOpen(false);
          setIsPerfConsoleOpen(false);
          setIsFullMapOpen(false);
          setIsSpawnMenuOpen(false);
          setIsRadialMenuOpen(false);
          setIsVehicleBoardOpen(false);
          setIsShopOpen(false);
          setIsDealershipOpen(false);
          setIsRealEstateModalOpen(false);
          setIsPropertyDocumentModalOpen(false);
          setIsUserProfileModalOpen(false);
          setIsFriendsModalOpen(false);
          setIsDateTimePickerOpen(false);
          setIsFurnitureStorageOpen(false);
          setIsGasStationCashierModalOpen(false);
          setIsEngineBayOpen(false);
          setIsFuelNozzleModalOpen(false);
          setIsCraneOutriggersModalOpen(false);
          setIsVacuumPumpModalOpen(false);
          setActiveElevatorMenu(null);
          e.preventDefault();
          return;
        }
        const nextPause = !isPauseMenuOpenRef.current;
        setIsPauseMenuOpen(nextPause);
        if (nextPause) {
          clearAllHeldInputs();
        }
        e.preventDefault();
        return;
      }

      // Block ALL gameplay & debug hotkeys while MainMenu, PauseMenu, or Loading screen is active
      if (isMainMenuOpenRef.current || isPauseMenuOpenRef.current || isLoadingRef.current) return;

      // Check whether any gameplay modal is open — allow closing that modal with its own toggle key,
      // but block all driving/world controls underneath so player doesn't accidentally drive or reset vehicle.
      const hasBlockingModal =
        m.isInventoryOpen || m.isInspectionOpen || m.isConsoleOpen || m.isPerfConsoleOpen ||
        m.isFullMapOpen || m.isSpawnMenuOpen || m.isRadialMenuOpen || m.isVehicleBoardOpen ||
        m.isCrashDiagnosticsOpen || m.isVacuumPumpModalOpen || m.isCraneOutriggersModalOpen ||
        m.isEngineBayOpen || m.isFuelNozzleModalOpen || m.isGasStationCashierModalOpen ||
        m.isFurnitureStorageOpen || m.isShopOpen || m.isDealershipOpen ||
        m.isRealEstateModalOpen || m.isPropertyDocumentModalOpen || m.isUserProfileModalOpen ||
        m.isFriendsModalOpen || m.isDateTimePickerOpen || m.isPerfTestOpen ||
        m.isCollisionTestOpen || m.hasActiveElevator || isOnlineModalOpenRef.current ||
        Boolean(activePhoneItemRef.current);

      if (hasBlockingModal) {
        if (!e.repeat) {
          if (m.isInventoryOpen && matchesKeybind('inventory', code)) {
            setIsInventoryOpen(false);
            e.preventDefault();
          } else if (m.isInspectionOpen && matchesKeybind('bodyInspection', code)) {
            setIsInspectionOpen(false);
            e.preventDefault();
          } else if (m.isFullMapOpen && matchesKeybind('fullMap', code)) {
            setIsFullMapOpen(false);
            e.preventDefault();
          } else if (isOnlineModalOpenRef.current && matchesKeybind('onlineMenu', code)) {
            setIsOnlineModalOpen(false);
            e.preventDefault();
          } else if (m.isVehicleBoardOpen && matchesKeybind('vehicleBoard', code)) {
            setIsVehicleBoardOpen(false);
            e.preventDefault();
          } else if (m.isConsoleOpen && matchesKeybind('aiConsole', code)) {
            setIsConsoleOpen(false);
            e.preventDefault();
          } else if (m.isCrashDiagnosticsOpen && matchesKeybind('crashDiagnostics', code)) {
            setIsCrashDiagnosticsOpen(false);
            e.preventDefault();
          } else if (m.isPerfConsoleOpen && matchesKeybind('perfProfiler', code)) {
            setIsPerfConsoleOpen(false);
            e.preventDefault();
          }
        }
        return;
      }

      // --- GLOBAL IN-GAME TOGGLES (no auto-repeat) ---
      if (!e.repeat) {
        if (matchesKeybind('inventory', code)) {
          if (isFurnitureStorageOpenRef.current) { e.preventDefault(); return; }
          clearAllHeldInputs();
          setIsInventoryOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('bodyInspection', code)) {
          clearAllHeldInputs();
          setIsInspectionOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('fullMap', code)) {
          clearAllHeldInputs();
          setIsFullMapOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('onlineMenu', code)) {
          sound.playButtonPress();
          clearAllHeldInputs();
          setIsOnlineModalOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('chat', code)) {
          clearAllHeldInputs();
          setIsChatFocused(true);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('slowMotion', code)) {
          setTimeScale((prev) => (prev < 1.0 ? 1.0 : lastSlowScaleRef.current));
          e.preventDefault();
          return;
        }
        if (matchesKeybind('cycleTime', code)) {
          cycleTimePreset();
          e.preventDefault();
          return;
        }
        if (matchesKeybind('aiConsole', code)) {
          setIsConsoleOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('crashDiagnostics', code)) {
          setIsCrashDiagnosticsOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('perfProfiler', code)) {
          setIsPerfConsoleOpen((prev) => !prev);
          e.preventDefault();
          return;
        }
      }

      // --- CONTINUOUS MOVEMENT KEYS (work on foot, in vehicle, and in crane/excavator mode) ---
      if (matchesKeybind('moveForward', code)) inputRef.current.forward = true;
      if (matchesKeybind('moveBackward', code)) inputRef.current.backward = true;
      if (matchesKeybind('turnLeft', code)) inputRef.current.left = true;
      if (matchesKeybind('turnRight', code)) inputRef.current.right = true;

      const p = playerRef.current;
      const world = worldRef.current;
      const inVehicle = Boolean(p && p.isInVehicle);
      const curVeh = inVehicle && world ? world.vehicles.find((v) => v.id === p?.currentVehicleId) : undefined;
      const isOperator = Boolean(
        inVehicle && p && (p.craneOperatorActive || (curVeh && isExcavatorVehicle(curVeh) && curVeh.exOperatorMode))
      );

      // --- 1. CRANE / EXCAVATOR OPERATOR MODE ---
      if (isOperator && p && world) {
        if (matchesKeybind('craneBoomRetract', code)) {
          inputRef.current.craneBoomRetract = true;
          if (!e.repeat) sound.playHydraulicHiss(0.18);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('craneBoomExtend', code)) {
          inputRef.current.craneBoomExtend = true;
          if (!e.repeat) sound.playHydraulicHiss(0.18);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('craneHookUp', code)) {
          inputRef.current.craneHookUp = true;
          if (!e.repeat) sound.playHydraulicHiss(0.18);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('craneHookDown', code)) {
          inputRef.current.craneHookDown = true;
          if (!e.repeat) sound.playHydraulicHiss(0.18);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('handbrake', code) && !e.repeat) {
          if (p.craneOperatorActive && curVeh && isVehicleCraneTruck(curVeh)) {
            toggleCraneHookAttach(curVeh, world, p);
            setVitalsRefreshTick((t) => t + 1);
            e.preventDefault();
            return;
          }
          inputRef.current.handbrake = true;
          e.preventDefault();
          return;
        }
        if (matchesKeybind('horn', code)) {
          if (!e.repeat) sound.playCraneHorn();
          e.preventDefault();
          return;
        }
        if (!e.repeat && matchesKeybind('specialMode', code) && curVeh && isExcavatorVehicle(curVeh)) {
          clearAllHeldInputs();
          curVeh.exOperatorMode = false;
          sound.playButtonPress();
          addPlayerNotification(p, 'ТВЭКС ЕК-12: транспортный режим (ход)', 'info');
          setVitalsRefreshTick((t) => t + 1);
          e.preventDefault();
          return;
        }
        return;
      }

      // --- 2. IN VEHICLE MODE ---
      if (inVehicle && p && world) {
        if (matchesKeybind('shiftUp', code)) {
          inputRef.current.shiftUp = true;
          if (code === 'AltLeft' || code === 'AltRight') e.preventDefault();
        }
        if (matchesKeybind('shiftDown', code)) {
          inputRef.current.shiftDown = true;
          if (code === 'AltLeft' || code === 'AltRight') e.preventDefault();
        }
        if (matchesKeybind('handbrake', code)) {
          inputRef.current.handbrake = true;
          e.preventDefault();
        }
        if (matchesKeybind('horn', code)) {
          inputRef.current.hornH = true;
        }
        if (matchesKeybind('tractorBrakeLeft', code)) inputRef.current.brakeLeft = true;
        if (matchesKeybind('tractorBrakeRight', code)) inputRef.current.brakeRight = true;

        if (!e.repeat) {
          if (matchesKeybind('transferCase', code)) {
            inputRef.current.transferCaseToggle = true;
            e.preventDefault();
            return;
          }
          if (matchesKeybind('diffLock', code)) {
            inputRef.current.diffLockToggle = true;
            e.preventDefault();
            return;
          }
          if (matchesKeybind('turnSignalLeft', code)) {
            toggleTurnSignal('left');
            e.preventDefault();
            return;
          }
          if (matchesKeybind('turnSignalRight', code)) {
            toggleTurnSignal('right');
            e.preventDefault();
            return;
          }
          if (matchesKeybind('hazardLights', code)) {
            toggleTurnSignal('hazard');
            e.preventDefault();
            return;
          }
          if (matchesKeybind('engineToggle', code)) {
            handleToggleEngine();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('vehicleBoard', code)) {
            clearAllHeldInputs();
            setIsVehicleBoardOpen((prev) => !prev);
            e.preventDefault();
            return;
          }
          if (matchesKeybind('toggleWindow', code)) {
            handleToggleWindow();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('headlights', code)) {
            toggleHeadlights();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('frontFogLights', code)) {
            handleToggleFrontFogLights();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('rearFogLights', code)) {
            handleToggleRearFogLights();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('roadTrainLights', code)) {
            handleToggleRoadTrainLights();
            e.preventDefault();
            return;
          }
          if (matchesKeybind('ptoToggle', code) && curVeh && vehicleHasPto(curVeh)) {
            togglePto(curVeh, p);
            setVitalsRefreshTick((t) => t + 1);
            e.preventDefault();
            return;
          }
          if (matchesKeybind('gboToggle', code) && curVeh?.hasGBO && curVeh.fuelSystem) {
            const nextActive = curVeh.fuelSystem.gboActive === false;
            curVeh.fuelSystem.gboActive = nextActive;
            sound.playButtonPress();
            const isWarm = (curVeh.engineState?.temperature ?? 0) >= 40;
            let msg = nextActive
              ? 'ГБО ВКЛ: Переключено на пропан-бутан!'
              : 'ГБО ВЫКЛ: Переключено на резервный бензин!';
            if (nextActive && !isWarm) {
              msg += ' (Режим прогрева: двигатель работает на бензине до 40°C)';
            }
            addPlayerNotification(p, msg, 'info');
            e.preventDefault();
            return;
          }
          if (matchesKeybind('tractorBrakeLatch', code) && curVeh && curVeh.type.startsWith('tractor_')) {
            const nextLatch = curVeh.tractorBrakeLatch === false;
            curVeh.tractorBrakeLatch = nextLatch;
            sound.playButtonPress();
            const lKey = getKeybindLabel('tractorBrakeLeft');
            const rKey = getKeybindLabel('tractorBrakeRight');
            const msg = nextLatch
              ? 'Тормоза МТЗ: СБЛОКИРОВАНЫ (оба колеса тормозят вместе)'
              : `Тормоза МТЗ: РАЗДЕЛЬНЫЕ (левый [${lKey}], правый [${rKey}])`;
            addPlayerNotification(p, msg, 'info');
            e.preventDefault();
            return;
          }
          if (matchesKeybind('specialMode', code)) {
            if (curVeh?.type === 'truck_water') {
              curVeh.isWashingNozzlesActive = !curVeh.isWashingNozzlesActive;
              sound.playButtonPress();
              const isPto = isPtoOn(curVeh);
              const isEng = !!curVeh.engineState?.engineRunning;
              const ptoKey = getKeybindLabel('ptoToggle');
              let msg = `Поливомоечные сопла: ${curVeh.isWashingNozzlesActive ? 'ВКЛЮЧЕНЫ' : 'ВЫКЛЮЧЕНЫ'}`;
              if (curVeh.isWashingNozzlesActive && (!isPto || !isEng)) {
                msg += ` (включите КОМ [${ptoKey}] и заведите двигатель для высокого давления)`;
              }
              addPlayerNotification(p, msg, curVeh.isWashingNozzlesActive ? 'info' : 'warning');
              e.preventDefault();
              return;
            }
            if (curVeh && isExcavatorVehicle(curVeh)) {
              clearAllHeldInputs();
              curVeh.exOperatorMode = true;
              sound.playButtonPress();
              const qK = getKeybindLabel('craneBoomRetract');
              const eK = getKeybindLabel('craneBoomExtend');
              const rK = getKeybindLabel('craneHookUp');
              const fK = getKeybindLabel('craneHookDown');
              addPlayerNotification(
                p,
                `ТВЭКС ЕК-12: режим работы (стрела: ${qK}/${eK}, ковш: ${rK}/${fK})`,
                'info'
              );
              setVitalsRefreshTick((t) => t + 1);
              e.preventDefault();
              return;
            }
          }
          if (matchesKeybind('gridMode', code)) {
            const cam = cameraRef.current;
            cam.gridMode = !cam.gridMode;
            setIsGridMode(!!cam.gridMode);
            addPlayerNotification(p, `Сетка кузова ${cam.gridMode ? 'ВКЛ' : 'ВЫКЛ'}`, 'info');
            e.preventDefault();
            return;
          }
        }
        return;
      }

      // --- 3. ON FOOT MODE ---
      if (matchesKeybind('sprint', code)) {
        inputRef.current.sprint = true;
      }
      if (!e.repeat && p) {
        if (matchesKeybind('handLeft', code)) {
          p.activeHand = 'left';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('handRight', code)) {
          p.activeHand = 'right';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
          e.preventDefault();
          return;
        }
        if (matchesKeybind('swapHand', code)) {
          p.activeHand = p.activeHand === 'left' ? 'right' : 'left';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
          e.preventDefault();
          return;
        }
        const hotbarActions = ['hotbar1', 'hotbar2', 'hotbar3', 'hotbar4', 'hotbar5', 'hotbar6'] as const;
        for (let hi = 0; hi < hotbarActions.length; hi++) {
          if (matchesKeybind(hotbarActions[hi], code)) {
            const item = p.inventory?.[hi];
            if (item) {
              setSelectedHotbarIndex(hi);
              selectedHotbarIndexRef.current = hi;
              const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
              const hotbarMedId = item.fluidStorage?.attributes?.medicalEffectId || item.originalCatalogId || item.itemId;
              if (item.category === 'med' && (TOPICAL_ITEMS.includes(hotbarMedId) || TOPICAL_ITEMS.includes(item.itemId))) {
                setTreatmentModalItem({ index: hi, item });
              } else {
                useItemOnPlayer(p, hi, worldRef.current || undefined);
              }
              sound.resume();
              setVitalsRefreshTick((t) => t + 1);
            }
            e.preventDefault();
            return;
          }
        }
        if (matchesKeybind('gridMode', code)) {
          const cam = cameraRef.current;
          cam.gridMode = !cam.gridMode;
          setIsGridMode(!!cam.gridMode);
          addPlayerNotification(p, `Сетка кузова ${cam.gridMode ? 'ВКЛ' : 'ВЫКЛ'}`, 'info');
          e.preventDefault();
          return;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      // Always release held movement/superstructure keys even if focus shifted to a button or chat mid-hold
      if (matchesKeybind('shiftUp', code)) inputRef.current.shiftUp = false;
      if (matchesKeybind('sprint', code)) inputRef.current.sprint = false;
      if (matchesKeybind('shiftDown', code)) {
        inputRef.current.shiftDown = false;
        if (code === 'AltLeft' || code === 'AltRight') e.preventDefault();
      }
      if (matchesKeybind('transferCase', code)) inputRef.current.transferCaseToggle = false;
      if (matchesKeybind('diffLock', code)) inputRef.current.diffLockToggle = false;
      if (matchesKeybind('moveForward', code)) inputRef.current.forward = false;
      if (matchesKeybind('moveBackward', code)) inputRef.current.backward = false;
      if (matchesKeybind('turnLeft', code)) inputRef.current.left = false;
      if (matchesKeybind('turnRight', code)) inputRef.current.right = false;
      if (matchesKeybind('tractorBrakeLeft', code)) inputRef.current.brakeLeft = false;
      if (matchesKeybind('tractorBrakeRight', code)) inputRef.current.brakeRight = false;
      if (matchesKeybind('handbrake', code)) inputRef.current.handbrake = false;
      if (matchesKeybind('horn', code)) inputRef.current.hornH = false;
      if (matchesKeybind('craneBoomRetract', code)) inputRef.current.craneBoomRetract = false;
      if (matchesKeybind('craneBoomExtend', code)) inputRef.current.craneBoomExtend = false;
      if (matchesKeybind('craneHookUp', code)) inputRef.current.craneHookUp = false;
      if (matchesKeybind('craneHookDown', code)) inputRef.current.craneHookDown = false;
    };

    const isWorldPointerBlocked = (): boolean => {
      if (isMainMenuOpenRef.current || isPauseMenuOpenRef.current || isLoadingRef.current) return true;
      const m = modalStateRef.current;
      if (
        m.isInventoryOpen || m.isInspectionOpen || m.isConsoleOpen || m.isPerfConsoleOpen ||
        m.isFullMapOpen || m.isSpawnMenuOpen || m.isRadialMenuOpen || m.isVehicleBoardOpen ||
        m.isCrashDiagnosticsOpen || m.isVacuumPumpModalOpen || m.isCraneOutriggersModalOpen ||
        m.isEngineBayOpen || m.isFuelNozzleModalOpen || m.isGasStationCashierModalOpen ||
        m.isFurnitureStorageOpen || m.isShopOpen || m.isDealershipOpen ||
        m.isRealEstateModalOpen || m.isPropertyDocumentModalOpen || m.isUserProfileModalOpen ||
        m.isFriendsModalOpen || m.isDateTimePickerOpen || m.isPerfTestOpen ||
        m.isCollisionTestOpen || m.hasActiveElevator || isOnlineModalOpenRef.current ||
        Boolean(activePhoneItemRef.current)
      ) {
        return true;
      }
      if (playerRef.current?.sleepState?.isLyingDown) return true;
      return false;
    };

    const isCanvasOrGlanceTarget = (el: EventTarget | null): boolean => {
      return el === canvas || (el instanceof HTMLElement && el.id === 'touch-windshield-glance-zone');
    };

    const cancelLongTap = () => {
      const lt = longTapRef.current;
      if (lt.timerId !== null) {
        window.clearTimeout(lt.timerId);
        lt.timerId = null;
      }
      if (lt.active) {
        lt.active = false;
        lt.touchId = -1;
        setLongTapVisual(null);
      }
      if (inputRef.current.lastPointerType === 'touch') {
        activeInteractionRef.current = null;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;
      inputRef.current.lastPointerType = 'mouse';

      const player = playerRef.current;
      if (canvas && e.target === canvas && !isWorldPointerBlocked()) {
        if (!player.isInVehicle) {
          const screenCenterX = window.innerWidth / 2;
          const screenCenterY = window.innerHeight / 2;
          const screenDx = e.clientX - screenCenterX;
          const screenDy = e.clientY - screenCenterY;
          const camAngle = cameraRef.current.angle;
          player.aimAngle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
        }

        if (worldRef.current && !activePlacementRef.current) {
          const mouseWorld = getMouseWorldPos(e.clientX, e.clientY);
          const nextInteraction = findPointedInteraction(player, worldRef.current, mouseWorld, false, spatialGridPropsRef.current);
          activeInteractionRef.current = nextInteraction;
          canvas.style.cursor = nextInteraction ? 'pointer' : 'crosshair';
        } else {
          activeInteractionRef.current = null;
          canvas.style.cursor = 'crosshair';
        }
      } else if (canvas && e.target !== canvas) {
        activeInteractionRef.current = null;
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
      if (e.button === 0) {
        inputRef.current.isMouseDown = true;
      }
      if (activePlacementRef.current) {
        if (e.button === 0) {
          handleExecutePlacement();
          e.preventDefault();
        } else if (e.button === 2) {
          setActivePlacement(null);
          activePlacementRef.current = null;
          e.preventDefault();
        }
        return;
      }
      // PC Right Mouse Button (RMB): interact with pointed world object/zone, or activate usable item in active hand
      if (e.button === 2 && canvas && e.target === canvas && !isWorldPointerBlocked()) {
        e.preventDefault();
        const p = playerRef.current;
        const w = worldRef.current;
        if (!p || !w) return;
        const mouseWorld = getMouseWorldPos(e.clientX, e.clientY);
        const pointedTarget = findPointedInteraction(p, w, mouseWorld, false, spatialGridPropsRef.current);
        activeInteractionRef.current = pointedTarget;
        if (pointedTarget) {
          handleExecuteActiveInteraction(pointedTarget);
        } else {
          executeActiveHandItem();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        inputRef.current.isMouseDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (activePlacementRef.current || (canvas && e.target === canvas)) {
        e.preventDefault();
      }
    };

    const LONG_TAP_MS = 380;
    const LONG_TAP_MOVE_CANCEL_PX = 14;

    const handleTouchStart = (e: TouchEvent) => {
      inputRef.current.lastPointerType = 'touch';
      if (e.touches.length !== 1) {
        cancelLongTap();
        return;
      }
      const touch = e.touches[0];
      const player = playerRef.current;
      if (player && !player.isInVehicle && canvas && e.target === canvas) {
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const screenDx = touch.clientX - screenCenterX;
        const screenDy = touch.clientY - screenCenterY;
        const camAngle = cameraRef.current.angle;
        player.aimAngle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
      }

      if (!isCanvasOrGlanceTarget(e.target) || isWorldPointerBlocked() || activePlacementRef.current) {
        cancelLongTap();
        return;
      }

      const world = worldRef.current;
      if (!player || !world) return;

      const touchWorld = getMouseWorldPos(touch.clientX, touch.clientY);
      const pointedTarget = findPointedInteraction(player, world, touchWorld, true, spatialGridPropsRef.current);
      const hasUsableHand = canUseActiveHandItem(player);

      if (pointedTarget) {
        activeInteractionRef.current = pointedTarget;
      } else {
        activeInteractionRef.current = null;
      }

      if (!pointedTarget && !hasUsableHand) {
        cancelLongTap();
        return;
      }

      cancelLongTap();
      // Re-apply highlighted target after cancelLongTap cleared it
      if (pointedTarget) {
        activeInteractionRef.current = pointedTarget;
      }

      const lt = longTapRef.current;
      lt.active = true;
      lt.touchId = touch.identifier;
      lt.startX = touch.clientX;
      lt.startY = touch.clientY;
      lt.clientX = touch.clientX;
      lt.clientY = touch.clientY;

      setLongTapVisual({ id: Date.now() + Math.random(), x: touch.clientX, y: touch.clientY });

      lt.timerId = window.setTimeout(() => {
        if (!lt.active) return;
        lt.active = false;
        lt.timerId = null;
        lt.touchId = -1;
        setLongTapVisual(null);

        if (isWorldPointerBlocked()) {
          activeInteractionRef.current = null;
          return;
        }
        const curP = playerRef.current;
        const curW = worldRef.current;
        if (!curP || !curW) {
          activeInteractionRef.current = null;
          return;
        }

        // Cancel any windshield glance-look camera drift started during hold
        inputRef.current.lookOffsetX = 0;
        inputRef.current.lookOffsetY = 0;
        inputRef.current.isTouchLookActive = false;

        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(22);
          }
        } catch {
          // ignore vibration errors on unsupported browsers
        }

        const worldPt = getMouseWorldPos(lt.clientX, lt.clientY);
        const freshTarget = findPointedInteraction(curP, curW, worldPt, true, spatialGridPropsRef.current);
        activeInteractionRef.current = null;
        if (freshTarget) {
          handleExecuteActiveInteraction(freshTarget);
        } else {
          executeActiveHandItem();
        }
      }, LONG_TAP_MS);
    };

    const handleTouchMove = (e: TouchEvent) => {
      inputRef.current.lastPointerType = 'touch';
      if (e.touches.length > 0 && canvas && e.target === canvas) {
        const touch = e.touches[0];
        const player = playerRef.current;
        if (player && !player.isInVehicle) {
          const screenCenterX = window.innerWidth / 2;
          const screenCenterY = window.innerHeight / 2;
          const screenDx = touch.clientX - screenCenterX;
          const screenDy = touch.clientY - screenCenterY;
          const camAngle = cameraRef.current.angle;
          player.aimAngle = Math.atan2(screenDy, screenDx) + camAngle + Math.PI / 2;
        }
      }

      const lt = longTapRef.current;
      if (lt.active) {
        let tracked: Touch | null = null;
        for (let i = 0; i < e.touches.length; i++) {
          if (e.touches[i].identifier === lt.touchId) {
            tracked = e.touches[i];
            break;
          }
        }
        if (!tracked) {
          cancelLongTap();
          return;
        }
        const moved = Math.hypot(tracked.clientX - lt.startX, tracked.clientY - lt.startY);
        if (moved > LONG_TAP_MOVE_CANCEL_PX) {
          cancelLongTap();
        } else {
          lt.clientX = tracked.clientX;
          lt.clientY = tracked.clientY;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const lt = longTapRef.current;
      if (!lt.active) return;
      let stillActive = false;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === lt.touchId) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive) {
        cancelLongTap();
      }
    };

    const handlePhoneModalEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ item?: InventoryItem }>;
      if (customEv.detail?.item) {
        setActivePhoneItem(customEv.detail.item);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('open_phone_modal', handlePhoneModalEvent);

    cleanupListeners = () => {
      cancelLongTap();
      gpuFxRef.current?.dispose();
      gpuFxRef.current = null;
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('open_phone_modal', handlePhoneModalEvent);
    };

    // --- MAIN GAME ANIMATION LOOP ---
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;
    let lastFrameAt = -Infinity;

    const gameLoop = (now: number) => {
      if (isMainMenuOpenRef.current || isPauseMenuOpenRef.current || isLoadingRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // If page is hidden (user switched tabs, is writing prompt in chat, or browser minimized),
      // hibernate CPU/GPU rendering: update network heartbeat at max 2 Hz and skip canvas draws
      if (isWindowHibernated) {
        if (now - lastHibernationTick > 500) {
          lastHibernationTick = now;
          if (worldRef.current && playerRef.current) {
            onlineManager.update(0.5, worldRef.current);
          }
        }
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

      // Frame cap (Графика → Лимит кадров). 0 = unlimited. Skipped frames don't advance lastTime,
      // so the simulation time stays correct when the cap is active.
      const capFps = fpsLimitRef.current;
      if (capFps > 0 && now - lastFrameAt < 1000 / capFps - 1.5) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }
      lastFrameAt = now;

      const frameStart = performance.now();
      const rawDt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      // Ease toward the chosen speed instead of snapping, so slow motion ramps in and out
      const targetScale = timeScaleRef.current;
      const smoothScale = smoothTimeScaleRef.current + (targetScale - smoothTimeScaleRef.current) * (1 - Math.exp(-rawDt / 0.12));
      smoothTimeScaleRef.current = Math.abs(targetScale - smoothScale) < 0.003 ? targetScale : smoothScale;
      const dt = rawDt * smoothTimeScaleRef.current;

      // FPS calculation (update React state only when rounded FPS actually changes)
      frameCount++;
      fpsTimer += rawDt;
      if (fpsTimer >= 0.75) {
        const nextFps = Math.round(frameCount / fpsTimer);
        if (nextFps !== lastFpsUiRef.current) {
          lastFpsUiRef.current = nextFps;
          setFps(nextFps);
        }
        frameCount = 0;
        fpsTimer = 0;
      }

      if (worldRef.current && rendererRef.current) {
        try {
          const world = worldRef.current;
          const player = playerRef.current;
          const camera = cameraRef.current;
          const input = inputRef.current;
          world.player = player;

        // 0. Update Online Multiplayer Network State & Synchronize Entities
        onlineManager.update(dt, world);
        if (
          onlineManager.status === 'connected' &&
          !onlineManager.isHost &&
          onlineManager.lastWorldStateSync &&
          (onlineManager.lastWorldStateSync.updatedAt || 0) > lastAppliedWorldSyncRef.current
        ) {
          const ws = onlineManager.lastWorldStateSync;
          lastAppliedWorldSyncRef.current = ws.updatedAt || Date.now();
          if (ws.calendar) {
            calendarRef.current = { ...ws.calendar };
            world.calendar = { ...ws.calendar };
            world.season = ws.calendar.season;
            setCalendar({ ...ws.calendar });
          }
          if (typeof ws.timeHour === 'number') {
            timeHourRef.current = ws.timeHour;
            world.timeHour = ws.timeHour;
            setTimeHour(ws.timeHour);
          }
          if (ws.weather && ws.weather !== weatherRef.current) {
            weatherRef.current = ws.weather;
            world.weather = ws.weather;
            setWeather(ws.weather);
          }
          if (ws.gameMode && ws.gameMode !== world.gameMode) {
            world.gameMode = ws.gameMode;
            if (typeof ws.trafficEnabled !== 'boolean') {
              applyTrafficDefaultForMode(ws.gameMode);
            }
          }
          if (typeof ws.trafficEnabled === 'boolean' && ws.trafficEnabled !== aiTrafficOnRef.current) {
            aiTrafficOnRef.current = ws.trafficEnabled;
            setIsAiTrafficOn(ws.trafficEnabled);
          }
          if (typeof ws.vehicleCount === 'number') {
            performanceConfig.nearbyVehiclesTarget = ws.vehicleCount;
            performanceConfig.maxVehicles = Math.max(12, ws.vehicleCount * 2);
          }
          if (typeof ws.pedestrianCount === 'number') {
            performanceConfig.maxActivePedestrians = ws.pedestrianCount;
          }
        }
        onlineSyncTimerRef.current += rawDt;
        const localVehForSync =
          player.isInVehicle && player.currentVehicleId
            ? world.vehicles.find((v) => v.id === player.currentVehicleId)
            : null;
        const isLocalActiveForSync = localVehForSync
          ? Math.abs(localVehForSync.speed) > 1.5 ||
            Math.abs(localVehForSync.vx || 0) > 1.5 ||
            Math.abs(localVehForSync.vy || 0) > 1.5 ||
            Math.abs(localVehForSync.angularVelocity || 0) > 0.05
          : Math.abs(player.vx || 0) > 1.0 ||
            Math.abs(player.vy || 0) > 1.0 ||
            Boolean(player.actionAnim);
        const onlineSyncInterval = isLocalActiveForSync ? 0.066 : 0.2;
        if (onlineSyncTimerRef.current >= onlineSyncInterval) {
          onlineSyncTimerRef.current = 0;
          onlineManager.broadcastLocalState(player, world);
        }

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

        // 2 & 3. Update Traffic Lights, Moving Trains & Railway Signaling
        // Network Guests do not run local AI traffic or pedestrian spawners; they receive authoritative traffic_sync from Host.
        const isNetworkGuest = onlineManager.status === 'connected' && !onlineManager.isHost;
        const tAiStart = performance.now();
        updateTrafficLights(world.intersections, dt);
        TrainSystem.update(world, dt, player.x, player.y, player);
        RailwaySignalingSystem.update(world, dt);
        if (aiTrafficOnRef.current && !isNetworkGuest) {
          updateAITraffic(world, dt, vehGrid, pedGrid, { x: player.x, y: player.y }, player, spatialGridPropsRef.current);
        }
        const tAiEnd = performance.now();

        // 4. Update Pedestrians (using spatial grids and player position)
        const tPedStart = performance.now();
        if (aiTrafficOnRef.current && !isNetworkGuest) {
          updatePedestrians(world, dt, vehGrid, pedGrid, bldGrid, { x: player.x, y: player.y }, spatialGridPropsRef.current, player);
        }
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

            // Constraint boundaries (full open-world size including northern wilderness)
            const minWorldX = -4000;
            const maxWorldX = Math.max(52000, world.width || 52000) - 50;
            const minWorldY = -5000;
            const maxWorldY = Math.max(30000, world.height || 30000) - 50;
            player.x = Math.max(minWorldX, Math.min(maxWorldX, player.x));
            player.y = Math.max(minWorldY, Math.min(maxWorldY, player.y));

            camera.targetX = player.x;
            camera.targetY = player.y;
            camera.targetAngle = 0;
            camera.targetZoom = 1.3 * userZoomFactorRef.current;
          } else {
            const isLyingInBed = bedSleepStateRef.current && bedSleepStateRef.current.isActive;
            const effectiveInput = isLyingInBed ? { ...input, forward: false, backward: false, left: false, right: false, sprint: false } : input;
            updatePlayerPedestrianPhysics(player, effectiveInput, playerNearbyBuildings, dt, camera.angle, world.width, world.height, world, vehGrid, spatialGridPropsRef.current);
            if (!player.needsHospitalEvacuation) {
              camera.targetX = player.x;
              camera.targetY = player.y;
              camera.targetAngle = 0;
              if (player.insideCarId || player.insideBusId) {
                camera.targetZoom = 2.4 * userZoomFactorRef.current;
              } else {
                camera.targetZoom = 1.3 * userZoomFactorRef.current;
              }
            }
          }

          // Water Hose Simulation (Verlet physics, finite length constraint, micro-leaks, and high pressure water spray)
          if (player.heldWaterHose) {
            if (player.isInVehicle) {
              stowWaterHose(player, world);
            } else {
              updateWaterHosePhysics(player, world, dt, !!(input.isMouseDown || input.actionE));
            }
          }

          // Continuous Hold Item Usage (e.g. Fire Extinguisher, Zippo Lighter)
          if (input.isMouseDown || input.actionE) {
            const currentSlot = selectedHotbarIndexRef.current ?? 0;
            const item = player.inventory?.[currentSlot];
            if (item && item.usable && (item.itemId === 'extinguisher'|| item.itemId === 'zippo_lighter'|| item.itemId === 'fuel_canister' || (item.itemId === 'canister_metal_20l' && (item.fluidStorage?.liquidId === 'gasoline_95' || item.fluidStorage?.liquidId === 'diesel')))) {
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

          // Check building interior zones if player is inside
          if (player.isInsideBuilding && player.insideBuildingId) {
            const bld = world.buildings.find(b => b.id === player.insideBuildingId);
            if (bld) {
              const currentFloor = player.currentFloor ?? 0;
              const layout = getBuildingLayout(bld, currentFloor);
              
              if (!player.needsHospitalEvacuation) {
                camera.targetX = player.x;
                camera.targetY = player.y;
              }

              const relX = player.x - bld.x;
              const relY = player.y - bld.y;

              // Dynamically check and update player's inside-apartment status based on physical coordinates inside the building floor
              const apartmentsList = getCityApartments();
              const floorApts = apartmentsList.filter(a => a.buildingId === bld.id && a.floor === currentFloor);
              let insideApt = null;
              
              if (bld.type === 'suburban') {
                insideApt = floorApts[0] || null;
              } else {
                for (const apt of floorApts) {
                  const rm = layout.rooms?.find(r => r.name === `Кв. ${apt.apartmentNumber}` || r.name === `Кв.${apt.apartmentNumber}`);
                  if (rm) {
                    if (relX >= rm.x && relX <= rm.x + rm.width && relY >= rm.y && relY <= rm.y + rm.height) {
                      insideApt = apt;
                      break;
                    }
                  }
                }
              }

              if (insideApt) {
                if (!player.isInsideApartment || player.insideApartmentId !== insideApt.id) {
                  player.isInsideApartment = true;
                  player.insideApartmentId = insideApt.id;
                }
              } else {
                if (player.isInsideApartment) {
                  player.isInsideApartment = false;
                  player.insideApartmentId = null;
                }
              }

              // Check if player is standing in or right next to ANY elevator zone
              const elevators = (layout.elevators && layout.elevators.length > 0) ? layout.elevators : (layout.elevatorZone ? [layout.elevatorZone] : []);
              const inElevator = elevators.some(el =>
                el &&
                relX >= el.x - 10 && relX <= el.x + el.width + 10 &&
                relY >= el.y - 10 && relY <= el.y + el.height + 10
              );
              const nearElevator = elevators.some(el =>
                el &&
                relX >= el.x - 46 && relX <= el.x + el.width + 46 &&
                relY >= el.y - 46 && relY <= el.y + el.height + 46
              );

              // Check if player is standing in or right next to ANY stairs zone
              const stairsList = (layout.stairs && layout.stairs.length > 0) ? layout.stairs : (layout.stairsZone ? [layout.stairsZone] : []);
              const inStairs = stairsList.some(st =>
                st &&
                relX >= st.x - 10 && relX <= st.x + st.width + 10 &&
                relY >= st.y - 10 && relY <= st.y + st.height + 10
              );
              const nearStairs = stairsList.some(st =>
                st &&
                relX >= st.x - 46 && relX <= st.x + st.width + 46 &&
                relY >= st.y - 46 && relY <= st.y + st.height + 46
              );

              // Check if player is standing in ANY exit zone on floor 0
              const exits = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
              const inExit = exits.some(ex =>
                ex &&
                relX >= ex.x - 24 && relX <= ex.x + ex.width + 24 &&
                relY >= ex.y - 24 && relY <= ex.y + stOrExWidth(ex) + 24
              );

              function stOrExWidth(z: { height: number }) {
                return z.height;
              }

              const maxFloors = getBuildingFloorsCount(bld);
              const canGoUpOrDown = inElevator || inStairs;

              if (canGoUpOrDown) {
                const elevType = inElevator ? 'elevator' : 'stairs';
                const elevSig = `${bld.id}_${currentFloor}_${elevType}`;
                if (prevActiveElevSigRef.current !== elevSig) {
                  prevActiveElevSigRef.current = elevSig;
                  setActiveElevatorMenu({
                    bldId: bld.id,
                    bldName: bld.nameRu || (bld.type || 'BUILDING').toUpperCase().replace('_', ''),
                    currentFloor: currentFloor,
                    maxFloors: maxFloors,
                    type: elevType
                  });
                }
              } else if (!nearElevator && !nearStairs) {
                if (prevActiveElevSigRef.current !== '') {
                  prevActiveElevSigRef.current = '';
                  setActiveElevatorMenu(null);
                }
              }

              if (prevCanExitBldRef.current !== inExit) {
                prevCanExitBldRef.current = inExit;
                setCanExitBuilding(inExit);
              }
              if (prevCanEnterBldIdRef.current !== null) {
                prevCanEnterBldIdRef.current = null;
                setCanEnterBuilding(null);
              }

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
              let shopName = currentRoomName || bld.nameRu || 'Магазин';

              if (bld.shopBrand === 'gas_station_shop' || bld.type === 'gas_station_shop' || bld.id === 'bld_gas_station_shop_se') {
                // Handled strictly via physical cashier register interaction
                shopType = null;
              } else if (bld.shopBrand === 'pharmacy_36_6'|| currentRoomName.includes('Аптека') || currentRoomName.includes('Панацея') || currentRoomName.includes('Медпункт') || bld.type === 'hospital') {
                shopType = 'pharmacy';
                shopIcon = '[МЕД]';
                badgeColor = '#10b981';
                shopName = currentRoomName || bld.nameRu || 'Аптека "Панацея"';
              } else if (bld.shopBrand === 'cofix_bakery'|| currentRoomName.includes('Урбан') || currentRoomName.includes('Пекарня')) {
                shopType = 'cafe';
                shopIcon = '[КАФЕ]';
                badgeColor = '#ea580c';
                shopName = currentRoomName || bld.nameRu || 'Кафе & Пекарня "Урбан & Бейкери"';
              } else if (bld.shopBrand === 'bean_bistro'|| currentRoomName.includes('Bean & Bistro') || currentRoomName.includes('Кофейня') || currentRoomName.includes('Кафе')) {
                shopType = 'cafe';
                shopIcon = '[КАФЕ]';
                badgeColor = '#f59e0b';
                shopName = currentRoomName || bld.nameRu || 'Кафе & Кофейня "Bean & Bistro"';
              } else if (bld.shopBrand === 'dodo_pizza'|| currentRoomName.includes('Пиццерия') || currentRoomName.includes('Империя') || currentRoomName.includes('Пицца')) {
                shopType = 'pizzeria';
                shopIcon = '[ПИЦЦА]';
                badgeColor = '#f97316';
                shopName = currentRoomName || bld.nameRu || 'Пиццерия "Пицца-Империя"';
              } else if (bld.shopBrand === 'vkusno_tochka'|| currentRoomName.includes('Бургер-Клаб') || currentRoomName.includes('Бургерная') || currentRoomName.includes('Фастфуд')) {
                shopType = 'fast_food';
                shopIcon = '[ЕДА]';
                badgeColor = '#ef4444';
                shopName = currentRoomName || bld.nameRu || 'Ресторан "Бургер-Клаб"';
              } else if (bld.shopBrand === 'mvideo'|| currentRoomName.includes('Электро-Маркет') || currentRoomName.includes('Электроника') || currentRoomName.includes('Гаджет')) {
                shopType = 'electronics';
                shopIcon = '[ТЕХ]';
                badgeColor = '#3b82f6';
                shopName = currentRoomName || bld.nameRu || 'Гипермаркет электроники "Электро-Маркет"';
              } else if (bld.shopBrand === 'sportmaster'|| currentRoomName.includes('Спорт-Олимп') || currentRoomName.includes('Спорт')) {
                shopType = 'sports_shop';
                shopIcon = '[СПОРТ]';
                badgeColor = '#0ea5e9';
                shopName = currentRoomName || bld.nameRu || 'Спортивный гипермаркет "Спорт-Олимп"';
              } else if (bld.type === 'car_dealership'|| currentRoomName.includes('Автосалон') || currentRoomName.includes('Шоурум')) {
                shopType = 'car_dealership';
                shopIcon = '[АВТОСАЛОН]';
                badgeColor = '#eab308';
                shopName = currentRoomName || bld.nameRu || 'Автосалон "Премиум Арт"';
              } else if (bld.shopBrand === 'pitstop_service'|| currentRoomName.includes('PIT-STOP') || currentRoomName.includes('Авто')) {
                shopType = 'auto_shop';
                shopIcon = '[АВТО]';
                badgeColor = '#0284c7';
                shopName = currentRoomName || bld.nameRu || 'Автомастерская & Сервис "PIT-STOP"';
              } else if (bld.shopBrand === 'splav_gear'|| currentRoomName.includes('Тракт') || currentRoomName.includes('Туризм') || currentRoomName.includes('Охота') || currentRoomName.includes('Снаряжение')) {
                shopType = 'gear_shop';
                shopIcon = '[ТУРИЗМ]';
                badgeColor = '#84cc16';
                shopName = currentRoomName || bld.nameRu || 'Магазин "Охота & Туризм Тракт"';
              } else if (bld.shopBrand === 'perekrestok'|| currentRoomName.includes('Азимут')) {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#16a34a';
                shopName = currentRoomName || bld.nameRu || 'Супермаркет "Азимут 24/7"';
              } else if (bld.shopBrand === 'pyaterochka'|| currentRoomName.includes('Регуляр')) {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#dc2626';
                shopName = currentRoomName || bld.nameRu || 'Супермаркет "Регуляр 24/7"';
              } else if (currentRoomName.includes('Суши') || currentRoomName.includes('WOK') || currentRoomName.includes('Сакура')) {
                shopType = 'sushi_asian';
                shopIcon = '[СУШИ]';
                badgeColor = '#ec4899';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Кинобар') || currentRoomName.includes('Синема') || currentRoomName.includes('Попкорн')) {
                shopType = 'cinema_bar';
                shopIcon = '[КИНО]';
                badgeColor = '#a855f7';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Одежда') || currentRoomName.includes('Мода') || currentRoomName.includes('Бутик')) {
                shopType = 'clothing';
                shopIcon = '[ОДЕЖДА]';
                badgeColor = '#6366f1';
                shopName = currentRoomName;
              } else if (currentRoomName.includes('Книжн') || currentRoomName.includes('Логос')) {
                shopType = 'bookstore';
                shopIcon = '[КНИГИ]';
                badgeColor = '#14b8a6';
                shopName = currentRoomName;
              } else if (bld.type === 'police_station') {
                shopType = 'gear_shop';
                shopIcon = '[ЩИТ]';
                badgeColor = '#1d4ed8';
                shopName = 'Арсенал & Снаряжение полиции';
              } else if (bld.type === 'shopping_mall'|| bld.type === 'commercial'|| bld.type === 'shop') {
                shopType = 'supermarket';
                shopIcon = '[ТОРГ]';
                badgeColor = '#f59e0b';
                shopName = currentRoomName || bld.nameRu || 'Торговый отдел';
              }

              let shopFound: CityShop | null = null;
              if (shopType) {
                const stableShopId = `room_shop_${bld.id}_${currentFloor}_${currentRoomName || shopType}`;
                shopFound = {
                  id: stableShopId,
                  nameRu: shopName,
                  type: shopType,
                  x: bld.x + relX,
                  y: bld.y + relY,
                  icon: shopIcon,
                  badgeColor: badgeColor,
                  description: `Отдел: ${shopName}.`};
              }

              nearShopRef.current = shopFound;
              const nextShopSig = shopFound ? `${shopFound.id}|${shopFound.nameRu}|${shopFound.type}` : '';
              if (prevNearShopSigRef.current !== nextShopSig) {
                prevNearShopSigRef.current = nextShopSig;
                setNearShop(shopFound);
              }
              const canRepair = shopFound?.type === 'auto_shop';
              if (prevCanRepairRef.current !== canRepair) {
                prevCanRepairRef.current = canRepair;
                setCanRepairVehicle(canRepair);
              }
            } else {
              if (prevActiveElevSigRef.current !== '') {
                prevActiveElevSigRef.current = '';
                setActiveElevatorMenu(null);
              }
              if (prevCanExitBldRef.current !== false) {
                prevCanExitBldRef.current = false;
                setCanExitBuilding(false);
              }
              if (prevCanEnterBldIdRef.current !== null) {
                prevCanEnterBldIdRef.current = null;
                setCanEnterBuilding(null);
              }
              nearShopRef.current = null;
              if (prevNearShopSigRef.current !== '') {
                prevNearShopSigRef.current = '';
                setNearShop(null);
              }
              if (prevCanRepairRef.current !== false) {
                prevCanRepairRef.current = false;
                setCanRepairVehicle(false);
              }
            }
          } else {
            if (prevActiveElevSigRef.current !== '') {
              prevActiveElevSigRef.current = '';
              setActiveElevatorMenu(null);
            }
            if (prevCanExitBldRef.current !== false) {
              prevCanExitBldRef.current = false;
              setCanExitBuilding(false);
            }

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

            const nextEnterId = nearEntrance && bldNear ? bldNear.id : null;
            if (prevCanEnterBldIdRef.current !== nextEnterId) {
              prevCanEnterBldIdRef.current = nextEnterId;
              setCanEnterBuilding(nearEntrance && bldNear ? bldNear : null);
            }

            // Outside on roads/streets: no shop interaction prompt
            nearShopRef.current = null;
            if (prevNearShopSigRef.current !== '') {
              prevNearShopSigRef.current = '';
              setNearShop(null);
            }
            const inVeh = player.isInVehicle;
            if (prevCanRepairRef.current !== inVeh) {
              prevCanRepairRef.current = inVeh;
              setCanRepairVehicle(inVeh);
            }
          }
        } else {
          if (prevActiveElevSigRef.current !== '') {
            prevActiveElevSigRef.current = '';
            setActiveElevatorMenu(null);
          }
          if (prevCanExitBldRef.current !== false) {
            prevCanExitBldRef.current = false;
            setCanExitBuilding(false);
          }
          if (prevCanEnterBldIdRef.current !== null) {
            prevCanEnterBldIdRef.current = null;
            setCanEnterBuilding(null);
          }
        }

        // Update all vehicles (both AI and player car)
        (world as any)._physicsFrameId = ((world as any)._physicsFrameId || 0) + 1;
        const sleepMargin = Math.hypot(window.innerWidth, window.innerHeight) / (2 * Math.max(0.4, camera.zoom)) + 350;
        let playerCar: Vehicle | null = null;
        const scratchVehNearbyBuildings: Building[] = [];
        const scratchVehNearbyCars: Vehicle[] = [];
        for (const veh of world.vehicles) {
          if (veh.isPlayerControlled) {
            playerCar = veh;
            // Play authentic acoustic relay tick/tock for player vehicle
            if (veh.turnSignal !== 'none') {
              const turnState = getVehicleTurnSignalDynamicState(veh);
              const isHyperflash = (veh.turnSignal === 'left' && (veh.damage?.leftHeadlightBroken || veh.damage?.leftTaillightBroken)) ||
                                   (veh.turnSignal === 'right' && (veh.damage?.rightHeadlightBroken || veh.damage?.rightTaillightBroken));

              if (turnState.isTick) {
                sound.playTurnSignalTick(true, turnState.config.soundType, isHyperflash);
              } else if (turnState.isTock) {
                sound.playTurnSignalTick(false, turnState.config.soundType, isHyperflash);
              }
            }
          }

          const dxP = veh.x - player.x;
          const dyP = veh.y - player.y;
          const distToPlayerSq = dxP * dxP + dyP * dyP;
          const isMoving = Math.abs(veh.speed) > 1 || Math.abs(veh.vx || 0) > 1 || Math.abs(veh.vy || 0) > 1;

          // Put stationary/parked non-player vehicles far outside the camera viewport to sleep
          if (!veh.isPlayerControlled && !(veh as any).isRemoteControlled && !isMoving && distToPlayerSq > sleepMargin * sleepMargin) {
            continue;
          }

          const vehNearbyCars = vehGrid.queryRadius(
            veh.x,
            veh.y,
            180,
            scratchVehNearbyCars
          );

          // Sleep completely dormant parked vehicles even inside viewport unless a moving vehicle is nearby
          // (ticks once every 30 frames for slow cooling/state maintenance, wakes instantly on proximity/motion)
          if (
            !veh.isPlayerControlled &&
            !(veh as any).isRemoteControlled &&
            !isMoving &&
            veh.isParked &&
            !veh.engineState?.engineRunning &&
            !veh.damage?.engineFire &&
            !veh.damage?.fuelTankFire &&
            !veh.damage?.cabinFire &&
            !veh.damage?.engineSmoking &&
            !veh.towedById &&
            !veh.trailerId &&
            veh.turnSignal === 'none' &&
            !veh.craneControlMode &&
            !veh.exOperatorMode &&
            ((world as any)._physicsFrameId % 30 !== 0)
          ) {
            let hasMovingNeighbor = false;
            for (let ni = 0; ni < vehNearbyCars.length; ni++) {
              const nv = vehNearbyCars[ni];
              if (nv !== veh && (nv.isPlayerControlled || Math.abs(nv.speed) > 1 || Math.abs(nv.vx || 0) > 1 || Math.abs(nv.vy || 0) > 1)) {
                hasMovingNeighbor = true;
                break;
              }
            }
            if (!hasMovingNeighbor) {
              continue;
            }
          }

          const vehNearbyBuildings = bldGrid.queryRadius(
            veh.x,
            veh.y,
            250,
            scratchVehNearbyBuildings
          );

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
            if ((player.craneOperatorActive || veh.craneOperatorActive) && isVehicleCraneTruck(veh)) {
              const cGeom = getVehicleCraneGeometry(veh);
              // Position player model sitting inside the revolving crane operator cab ("скворечник")
              const cosT = Math.cos(cGeom.turretAngle);
              const sinT = Math.sin(cGeom.turretAngle);
              const cabVehX = cGeom.turretLocalX + 1.1 * cosT - (-7.4) * sinT;
              const cabVehY = 1.1 * sinT + (-7.4) * cosT;
              const cosV = Math.cos(veh.angle);
              const sinV = Math.sin(veh.angle);
              player.x = veh.x + cabVehX * cosV - cabVehY * sinV;
              player.y = veh.y + cabVehX * sinV + cabVehY * cosV;
              player.angle = veh.angle + cGeom.turretAngle;

              // Camera smoothly anchored between turntable and hook work radius, free of driverPeek jitter
              const camWorkDist = Math.max(16, cGeom.totalBoomReachPx * 0.45);
              camera.targetX = cGeom.worldTurretX + Math.cos(cGeom.worldBoomAngle) * camWorkDist;
              camera.targetY = cGeom.worldTurretY + Math.sin(cGeom.worldBoomAngle) * camWorkDist;
              camera.targetAngle = veh.angle;
              camera.targetZoom = 1.25 * userZoomFactorRef.current;
            } else if (isExcavatorVehicle(veh) && veh.exOperatorMode) {
              const exGeom = getExcavatorGeometry(veh);
              player.x = veh.x;
              player.y = veh.y;
              camera.targetX = exGeom.worldTurretX + (exGeom.worldBucketX - exGeom.worldTurretX) * 0.34;
              camera.targetY = exGeom.worldTurretY + (exGeom.worldBucketY - exGeom.worldTurretY) * 0.34;
              camera.targetAngle = veh.angle;
              camera.targetZoom = 1.22 * userZoomFactorRef.current;
            } else {
              player.x = veh.x;
              player.y = veh.y;

              const speedAbs = Math.abs(veh.speed);
              const isReversingCar = veh.speed < -5;
              const travelAngle = isReversingCar ? veh.angle + Math.PI : veh.angle;

              // 1. Balanced Forward Bias: subtle forward lookahead that keeps player vehicle centered and visible
              // Rest: 0px, 40 km/h (~150 px/s): ~22px, 80 km/h (~300 px/s): ~45px, 140+ km/h (~500 px/s): ~75px max
              const forwardDist = Math.min(75, speedAbs * 0.15);

              // 2. Subtle Steering Apex Bias: slight hint into turning arc without shifting vehicle off-center
              const steer = veh.steerAngle || 0;
              const lateralDist = steer * Math.min(25, 10 + speedAbs * 0.04);

              // 3. Optional Driver Free Look / Glance: gentle manual peek
              let lookNormX = 0;
              let lookNormY = 0;

              if (input.lookOffsetX !== undefined && input.lookOffsetY !== undefined && (input.isTouchLookActive || Math.abs(input.lookOffsetX) > 0.001 || Math.abs(input.lookOffsetY) > 0.001)) {
                lookNormX = Math.max(-1, Math.min(1, input.lookOffsetX));
                lookNormY = Math.max(-1, Math.min(1, input.lookOffsetY));
              } else if (input.lastPointerType === 'mouse') {
                const halfW = (window.innerWidth || 1920) * 0.5;
                const halfH = (window.innerHeight || 1080) * 0.5;
                lookNormX = Math.max(-1, Math.min(1, ((input.mouseX ?? halfW) - halfW) / (halfW || 1)));
                lookNormY = Math.max(-1, Math.min(1, ((input.mouseY ?? halfH) - halfH) / (halfH || 1)));
              }

              const driverPeekForward = -lookNormY * 35;
              const driverPeekSide = lookNormX * 30;

              const totalForward = forwardDist + driverPeekForward;
              const totalLateral = lateralDist + driverPeekSide;

              const cosA = Math.cos(travelAngle);
              const sinA = Math.sin(travelAngle);
              const latCos = -sinA;
              const latSin = cosA;

              camera.targetX = veh.x + cosA * totalForward + latCos * totalLateral;
              camera.targetY = veh.y + sinA * totalForward + latSin * totalLateral;
              camera.targetAngle = veh.angle;

              // Dynamic camera zoom: smooth wide-angle transition at high speeds to open view naturally
              const speedRatio = Math.min(1.0, speedAbs / 500);
              camera.targetZoom = (1.15 - speedRatio * 0.30) * userZoomFactorRef.current;
            }
          }
        }

        // Survival & Needs Simulation (Hunger, Thirst, Fatigue, Sleepiness, Health)
        updatePlayerNeedsAndVitals(player, world, dt, input, timeHourRef.current);

        // Apartment Bed Sleeping & Night Awakening State Machine
        if (bedSleepStateRef.current && bedSleepStateRef.current.isActive) {
          const nextSleepState = updateBedSleepCycle(
            bedSleepStateRef.current,
            player,
            dt,
            timeHourRef.current,
            (newHour) => {
              let diff = newHour - timeHourRef.current;
              if (diff < 0) diff += 24;
              const { calendar: nextCal } = advanceCalendar(calendarRef.current, diff);
              calendarRef.current = nextCal;
              timeHourRef.current = nextCal.timeHour;
              setTimeHour(nextCal.timeHour);
              setCalendar({ ...nextCal });
            }
          );
          bedSleepStateRef.current = nextSleepState;
          setBedSleepState({ ...nextSleepState });
        }

        // Update Gas Station Pump Dispenser Fuel Flow & Sounds
        updateGasPumps(world, dt, (pump, veh) => {
          sound.playBuySell();
          if (player) {
            addPlayerNotification(player, `Заправка на колонке №${pump.pumpNumber} завершена (${pump.displayLiters?.toFixed(1)} л)! Извлеките пистолет.`, 'info');
          }
        });

        if (isInvincibleRef.current || isCreativeModeRef.current || isCleanModeRef.current) {
          player.needs.health = 100;
          player.needs.hunger = 100;
          player.needs.thirst = 100;
          player.needs.energy = 100;
          player.needs.sleepiness = 0;
          player.isCleanMode = isCleanModeRef.current;
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

        // Session statistics for the pause screen (real time, not scaled by slow motion)
        {
          const ss = sessionStatsRef.current;
          ss.playMs += rawDt * 1000;
          if (ss.lastX !== null && ss.lastY !== null) {
            const moved = Math.hypot(player.x - ss.lastX, player.y - ss.lastY);
            if (moved < 1500) ss.distPx += moved; // ignore teleports / respawns
          }
          ss.lastX = player.x;
          ss.lastY = player.y;
          if (playerCar) {
            const kmh = Math.abs(playerCar.speed) * PX_S_TO_SPEED_KMH;
            if (kmh > ss.maxKmh) ss.maxKmh = kmh;
          }
        }

        // 6. Throttled HUD State Updates (Run at ~12.5 Hz to prevent React re-render lag)
        // Use real frame time so HUD refresh rate does not drop in slow motion
        const mHud = modalStateRef.current;
        const isFullscreenModalBlockingHud =
          mHud.isFullMapOpen ||
          mHud.isInventoryOpen ||
          mHud.isInspectionOpen ||
          mHud.isFurnitureStorageOpen ||
          mHud.isShopOpen ||
          mHud.isDealershipOpen ||
          mHud.isRealEstateModalOpen;
        hudUpdateTimerRef.current += rawDt;
        hudTickAccumRef.current += rawDt;
        if (hudUpdateTimerRef.current >= 0.1 && !isFullscreenModalBlockingHud) {
          hudUpdateTimerRef.current = 0;

          if (playerCar) {
            const currentSpeedKmh = Math.round(Math.abs(playerCar.speed) * PX_S_TO_SPEED_KMH);
            setSpeedKmh(currentSpeedKmh);
            const carActive = Boolean(playerCar.engineState?.engineRunning) || Math.abs(playerCar.speed) > 0.5 || Boolean(playerCar.damage?.engineFire);
            if (carActive && hudTickAccumRef.current >= 0.2) {
              hudTickAccumRef.current = 0;
              setHudTick((t) => (t + 1) % 1000000);
            }
            setIsDrifting(playerCar.isDrifting);
            setPlayerTurnSignal(playerCar.turnSignal);
            if (playerCar.damage) {
              const isSmoking = !!playerCar.damage.engineSmoking;
              const isFire = !!(playerCar.damage.engineFire || playerCar.damage.fuelTankFire || playerCar.damage.cabinFire);
              const isWindshield = !!playerCar.damage.windshieldCracked;
              const isHood = !!playerCar.damage.hoodBuckled;
              const isLights = !!(
                playerCar.damage.leftHeadlightBroken || 
                playerCar.damage.rightHeadlightBroken || 
                playerCar.damage.leftTaillightBroken || 
                playerCar.damage.rightTaillightBroken
              );
              setDamageDetails(prev => {
                if (
                  prev &&
                  prev.engineSmoking === isSmoking &&
                  prev.engineFire === isFire &&
                  prev.windshieldCracked === isWindshield &&
                  prev.hoodBuckled === isHood &&
                  prev.lightsBroken === isLights
                ) {
                  return prev;
                }
                return {
                  engineSmoking: isSmoking,
                  engineFire: isFire,
                  windshieldCracked: isWindshield,
                  hoodBuckled: isHood,
                  lightsBroken: isLights
                };
              });
            }

            if (playerCar.engineState) {
              const eng = playerCar.engineState;
              const isHydro = eng.transmissionKind === 'HYDRO' || isRoadMachinery(playerCar.type);
              if (isHydro) {
                if (eng.autoGearMode === 'R' || eng.currentGear === -1) setGear('R');
                else if (eng.autoGearMode === 'N' || eng.autoGearMode === 'P' || eng.currentGear === 0) setGear('N');
                else setGear((eng.currentGear ?? 1) >= 2 ? '2' : '1');
              } else if (eng.transmissionType === 'AUTO') {
                setGear(eng.autoGearMode || 'D');
              } else {
                setGear(eng.currentGear === -1 ? 'R': eng.currentGear === 0 ? 'N': String(eng.currentGear));
              }
            } else {
              setGear('D');
            }
          }

          // Determine current street name only when player actually moved > 24px
          const sdx = player.x - lastStreetPosRef.current.x;
          const sdy = player.y - lastStreetPosRef.current.y;
          if (sdx * sdx + sdy * sdy > 576) {
            lastStreetPosRef.current.x = player.x;
            lastStreetPosRef.current.y = player.y;
            const currentStreet = findStreetNameAtPosition(world, player.x, player.y);
            setStreetName(currentStreet);
          }

          // World-space pointer interaction outline refresh (PC hover or active Mobile Long-Tap)
          if (isWorldPointerBlocked() || activePlacementRef.current) {
            activeInteractionRef.current = null;
          } else if (input.lastPointerType !== 'touch') {
            const mouseWorld = getMouseWorldPos(input.mouseX || 0, input.mouseY || 0);
            const currentInteraction = findPointedInteraction(player, world, mouseWorld, false, spatialGridPropsRef.current);
            activeInteractionRef.current = currentInteraction;
            if (canvas) {
              canvas.style.cursor = currentInteraction ? 'pointer' : 'crosshair';
            }
          } else if (longTapRef.current.active) {
            const touchWorld = getMouseWorldPos(longTapRef.current.clientX, longTapRef.current.clientY);
            activeInteractionRef.current = findPointedInteraction(player, world, touchWorld, true, spatialGridPropsRef.current);
          } else {
            activeInteractionRef.current = null;
          }

          // GPS Navigation Route recalculation & Arrival check
          if (world.gpsDestination) {
            const distToDest = Math.hypot(world.gpsDestination.x - player.x, world.gpsDestination.y - player.y);
            const isTaxiActive = !!TaxiFleetSystem.getInstance().activeOrder;
            if (distToDest < 60 && !isTaxiActive) {
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
            const curMinute = Math.floor(timeHourRef.current * 60);
            if (curMinute !== lastTimeMinuteRef.current) {
              lastTimeMinuteRef.current = curMinute;
              setTimeHour(timeHourRef.current);
            }
          }
          if (weatherTransitionRef.current < 1.0) {
            const wtStep = Math.round(weatherTransitionRef.current * 40);
            if (wtStep !== lastWeatherTransStepRef.current) {
              lastWeatherTransStepRef.current = wtStep;
              setWeatherTransition(weatherTransitionRef.current);
            }
          }
        }

        // 7. Update Skid marks, Particles & Breakables / Living World
        world.previousWeather = previousWeatherRef.current;
        world.weather = weatherRef.current;
        world.weatherTransition = weatherTransitionRef.current;
        world.timeHour = timeHourRef.current;
        world.calendar = calendarRef.current;
        world.season = calendarRef.current.season;

        // Dynamic seasonal weather adaptation
        const curOutsideTemp = getOutsideTemperature(world, timeHourRef.current);
        world.outsideTemp = curOutsideTemp;

        if (world.gameMode !== 'freeroam') {
          if (curOutsideTemp <= 0.0 && (weatherRef.current === 'rain' || weatherRef.current === 'drizzle')) {
            previousWeatherRef.current = weatherRef.current;
            setWeather('snow');
            weatherRef.current = 'snow';
            setWeatherTransition(0.0);
            weatherTransitionRef.current = 0.0;
            world.previousWeather = previousWeatherRef.current;
            world.weather = 'snow';
            world.weatherTransition = 0.0;
          } else if (Math.random() < 0.0015 * dt) {
            const nextSeasonalWeather = pickRandomSeasonalWeather(calendarRef.current, curOutsideTemp);
            if (nextSeasonalWeather !== weatherRef.current) {
              previousWeatherRef.current = weatherRef.current;
              setWeather(nextSeasonalWeather);
              weatherRef.current = nextSeasonalWeather;
              setWeatherTransition(0.0);
              weatherTransitionRef.current = 0.0;
              world.previousWeather = previousWeatherRef.current;
              world.weather = nextSeasonalWeather;
              world.weatherTransition = 0.0;
            }
          }
        }

        updateSurfaceHydrologyAndSnow(world, dt);
        updateSkidMarksAndParticles(world, player, dt);
        updateBreakablePropsAndLivingWorld(world, player, dt, vehGrid, spatialGridPropsRef.current);
        updateCameraPoles(world, dt, player, onlineManager.getRemotePlayersArray(), timeHourRef.current);

        // Taxi Fleet Driver System Simulation (Order dispatch, passenger boarding, comfort rating, physical cash)
        TaxiFleetSystem.getInstance().update(
          dt,
          world,
          player,
          handleSetGpsTarget,
          (msg, type) => addPlayerNotification(player, msg, type || 'info')
        );

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
                steerAngle: 0,
                targetSteerAngle: 0,
                speed: 250,
                maxSpeed: 600,
                lateralVelocity: 0,
                angularVelocity: 0,
                isDrifting: false,
                driftFactor: 0,
                mass: 2200,
                acceleration: 400,
                braking: 400,
                color: '#f8fafc',
                roofColor: '#f8fafc',
                isParked: false,
                isPlayerControlled: false,
                headlightsOn: true,
                headlightMode: 'high',
                brakeLightsOn: false,
                turnSignal: 'none',
                turnSignalTimer: 0,
                requiredFuel: 'ai95',
                sirenOn: true,
                sirenStrobe: 0,
                targetSpeed: 250,
                currentLaneId: null,
                targetWaypointIndex: 0,
                routeWaypoints: [],
                aiState: 'driving',
                stuckTimer: 0,
                honkTimer: 0,
                isHonking: false,
                hornEffectTimer: 0,
                engineState: createDefaultEngineState('ambulance_van', true, false),
                fuelSystem: createDefaultFuelSystem('ambulance_van', false),
                damage: createDefaultVehicleDamage()
              } as Vehicle;
              applyPowertrain(amb);
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

              addPlayerNotification(player, `Вы доставлены в палату интенсивной терапии Городской Больницы №1!`, 'heal');
            }
          }
        }

        // 8.5. Smooth Camera Lerp with velocity-responsive tracking
        if (player.insideCarId || player.insideBusId) {
          // Direct rock-solid tracking while inside train or bus eliminates all camera interpolation lag and jitter
          camera.x = player.x;
          camera.y = player.y;
        } else {
          const camLerpSpeed = player.isInVehicle ? 8.5 : 6.0;
          camera.x += (camera.targetX - camera.x) * camLerpSpeed * dt;
          camera.y += (camera.targetY - camera.y) * camLerpSpeed * dt;
        }
        camera.zoom += (camera.targetZoom - camera.zoom) * 4.5 * dt;
        if (camera.shakeTimer > 0) {
          camera.shakeTimer = Math.max(0, camera.shakeTimer - dt);
          if (camera.shakeVx) camera.shakeVx *= Math.pow(0.82, dt * 60);
          if (camera.shakeVy) camera.shakeVy *= Math.pow(0.82, dt * 60);
        } else {
          camera.shakeVx = 0;
          camera.shakeVy = 0;
        }

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

        // 9. Query objects in Camera Viewport with rotated-screen OBB culling for high-performance rendering
        const tVpStart = performance.now();
        const invZoom = 1 / Math.max(0.4, camera.zoom);
        const drawDist = performanceConfig.drawDistance;
        const vpMargin = (Math.hypot(window.innerWidth, window.innerHeight) * 0.5 * invZoom + 150) * drawDist;
        const bldMargin = vpMargin + 600;
        const obbHalfW = window.innerWidth * 0.5 * invZoom * drawDist;
        const obbHalfH = window.innerHeight * 0.5 * invZoom * drawDist;
        const camRot = -camera.angle - Math.PI * 0.5;
        const camCos = Math.cos(camRot);
        const camSin = Math.sin(camRot);
        const cxCam = camera.x;
        const cyCam = camera.y;

        const filterPointObbInPlace = <T extends { x: number; y: number }>(arr: T[], pad: number): T[] => {
          const limX = obbHalfW + pad;
          const limY = obbHalfH + pad;
          let write = 0;
          for (let i = 0; i < arr.length; i++) {
            const item = arr[i];
            const dx = item.x - cxCam;
            const dy = item.y - cyCam;
            const lx = dx * camCos - dy * camSin;
            const ly = dx * camSin + dy * camCos;
            if (lx >= -limX && lx <= limX && ly >= -limY && ly <= limY) {
              arr[write++] = item;
            }
          }
          arr.length = write;
          return arr;
        };

        const rawBuildings = bldGrid.queryRect(
          cxCam - bldMargin,
          cyCam - bldMargin,
          bldMargin * 2,
          bldMargin * 2,
          scratchVpBuildingsRef.current
        );
        {
          let bw = 0;
          for (let i = 0; i < rawBuildings.length; i++) {
            const b = rawBuildings[i];
            const bCx = b.x + b.width * 0.5;
            const bCy = b.y + b.height * 0.5;
            const bRad = Math.hypot(b.width, b.height) * 0.5 + 480;
            const dx = bCx - cxCam;
            const dy = bCy - cyCam;
            const lx = dx * camCos - dy * camSin;
            const ly = dx * camSin + dy * camCos;
            if (lx >= -(obbHalfW + bRad) && lx <= obbHalfW + bRad && ly >= -(obbHalfH + bRad) && ly <= obbHalfH + bRad) {
              rawBuildings[bw++] = b;
            }
          }
          rawBuildings.length = bw;
        }
        const vpBuildings = rawBuildings;

        const vpVehicles = capNearest(filterPointObbInPlace(vehGrid.queryRect(
          cxCam - vpMargin,
          cyCam - vpMargin,
          vpMargin * 2,
          vpMargin * 2,
          scratchVpVehiclesRef.current
        ), 360), performanceConfig.maxVisibleVehicles, cxCam, cyCam);
        const vpPedestrians = capNearest(filterPointObbInPlace(pedGrid.queryRect(
          cxCam - vpMargin,
          cyCam - vpMargin,
          vpMargin * 2,
          vpMargin * 2,
          scratchVpPedestriansRef.current
        ), 160), performanceConfig.maxVisiblePedestrians, cxCam, cyCam);
        const vpTrees = capNearest(filterPointObbInPlace(spatialGridTreesRef.current.queryRect(
          cxCam - vpMargin,
          cyCam - vpMargin,
          vpMargin * 2,
          vpMargin * 2,
          scratchVpTreesRef.current
        ), 220), performanceConfig.maxVisibleTrees, cxCam, cyCam);
        const vpProps = capNearest(filterPointObbInPlace(spatialGridPropsRef.current.queryRect(
          cxCam - vpMargin,
          cyCam - vpMargin,
          vpMargin * 2,
          vpMargin * 2,
          scratchVpPropsRef.current
        ), 160), performanceConfig.maxVisibleProps, cxCam, cyCam);
        const vpSidewalks = spatialGridSidewalksRef.current.queryRect(
          cxCam - vpMargin,
          cyCam - vpMargin,
          vpMargin * 2,
          vpMargin * 2,
          scratchVpSidewalksRef.current
        );
        const tVpEnd = performance.now();

        // Advance simulation time (Realistic 24-minute full day cycle: 1 in-game hour = 60 real seconds, 1 in-game min = 1 real sec)
        const GAME_HOURS_PER_REAL_SECOND = 1 / 60;
        if (isTimeAutoCyclingRef.current && world.gameMode !== 'freeroam') {
          const deltaHours = dt * GAME_HOURS_PER_REAL_SECOND;
          const { calendar: nextCal, wrappedDays } = advanceCalendar(calendarRef.current, deltaHours);
          calendarRef.current = nextCal;
          timeHourRef.current = nextCal.timeHour;

          if (wrappedDays !== 0) {
            setCalendar({ ...nextCal });
          }
        }

        // Smooth visual celestial clock time interpolation:
        // Glides day/night sky, shadows, and lighting seamlessly without abrupt jarring jumps
        let timeDelta = timeHourRef.current - displayTimeHourRef.current;
        while (timeDelta < -12) timeDelta += 24;
        while (timeDelta > 12) timeDelta -= 24;
        if (Math.abs(timeDelta) > 0.0005) {
          const glideSpeed = Math.abs(timeDelta) > 1.2 ? 3.2 : 10.0;
          displayTimeHourRef.current = ((displayTimeHourRef.current + timeDelta * Math.min(1.0, dt * glideSpeed)) % 24 + 24) % 24;
        } else {
          displayTimeHourRef.current = timeHourRef.current;
        }

        if (weatherTransitionRef.current < 1.0) {
          // Atmospheric gradual weather evolution: ~16 seconds smooth natural blending
          const transitionSpeed = 1.0 / 16.0;
          weatherTransitionRef.current = Math.min(1.0, weatherTransitionRef.current + dt * transitionSpeed);
          world.weatherTransition = weatherTransitionRef.current;
        }

        // Continuously modulate rain and wintry hush ambient volume with smooth weather weights
        const curWeatherWeights = getEffectiveWeatherWeights(world);
        sound.setRainVolume(curWeatherWeights.rain);
        sound.setSnowAmbientVolume(curWeatherWeights.snow, curWeatherWeights.blizzard);

        // Calculate mouse world position for placement preview
        let currentMouseWorldPos = null;
        if (activePlacementRef.current) {
          currentMouseWorldPos = getMouseWorldPos(input.mouseX || 0, input.mouseY || 0);
        }

        // 10. Render Scene with pre-culled viewport entities (skipped when opaque fullscreen modal covers entire screen)
        const tRenderStart = performance.now();
        const mRender = modalStateRef.current;
        const isOpaqueFullscreenModalOpen =
          isFullMapOpenRef.current ||
          mRender.isInventoryOpen ||
          mRender.isInspectionOpen ||
          mRender.isFurnitureStorageOpen ||
          mRender.isShopOpen ||
          mRender.isDealershipOpen ||
          mRender.isRealEstateModalOpen;
        if (!isOpaqueFullscreenModalOpen) {
          rendererRef.current.render(
            world,
            player,
            camera,
            displayTimeHourRef.current,
            weatherTransitionRef.current,
            vpBuildings,
            vpVehicles,
            vpPedestrians,
            vpTrees,
            vpProps,
            vpSidewalks,
            activePlacementRef.current,
            currentMouseWorldPos,
            onlineManager.getRemotePlayersArray(),
            onlineManager.getSpeechBubbles(),
            activeInteractionRef.current
          );
        }
        // GPU post-processing of the finished 2D frame (lazily created & disposed)
        {
          const fx = syncGpuFxLifecycle();
          const gpuCanvas = gpuCanvasRef.current;
          if (fx && gpuCanvas) {
            if (performanceConfig.enableGpuPostFx && !isOpaqueFullscreenModalOpen) {
              const cal = calendarRef.current;
              const worldWind = worldRef.current.wind;
              const windGust = worldWind?.gust ?? 1.0;
              const camRiver = getRiverWaterAt(camera.x, camera.y);
              const camShake = rendererRef.current.getActiveCameraShake();
              const fxWorld = worldRef.current;
              const fxFreezeProg = fxWorld.iceFreezeProgress ?? 0;
              const ok = fx.render(
                {
                  hour: displayTimeHourRef.current,
                  weather: weatherRef.current,
                  cameraAngle: camera.angle,
                  cameraX: camera.x - camShake.x,
                  cameraY: camera.y - camShake.y,
                  cameraZoom: camera.zoom,
                  isFreezing: fxFreezeProg >= 0.5,
                  freezeProgress: fxFreezeProg,
                  surfaceWetness: fxWorld.surfaceWetness ?? 0,
                  soilMoisture: fxWorld.soilMoisture ?? 0,
                  snowCover: fxWorld.snowCover ?? 0,
                  roadSnowCover: fxWorld.roadSnowCover ?? 0,
                  slushLevel: fxWorld.slushLevel ?? 0,
                  windVx: worldWind ? worldWind.vx * windGust : 14,
                  windVy: worldWind ? worldWind.vy * windGust : 4,
                  riverFlowVx: camRiver.currentVx,
                  riverFlowVy: camRiver.currentVy,
                  timeSec: now / 1000,
                  dt: rawDt,
                  sunrise: cal.sunriseHour,
                  sunset: cal.sunsetHour,
                  season: cal.season,
                  hasResidualWetness: (fxWorld.surfaceWetness ?? 0) > 0.05,
                  lightmap: rendererRef.current.getFxLightmap(),
                  lightColor: rendererRef.current.getFxLightColorMap(),
                  materialMap: rendererRef.current.getFxMaterialMap(),
                  fires: rendererRef.current.getActivePostFxFires(),
                  wakes: getActivePostFxWaterWakes(camera.x, camera.y, 32),
                },
                {
                  bloom: performanceConfig.gpuBloom,
                  bloomRadius: performanceConfig.gpuBloomRadius,
                  grading: performanceConfig.gpuGrading,
                  clarity: performanceConfig.gpuClarity,
                  relief: performanceConfig.gpuRelief,
                  sharpness: performanceConfig.gpuSharpness,
                  vignette: performanceConfig.gpuVignette,
                  grain: performanceConfig.gpuGrain,
                  chromatic: performanceConfig.gpuChromatic,
                  antiAlias: performanceConfig.gpuAntiAlias,
                  bicubicUpscale: performanceConfig.gpuBicubicUpscale,
                  gi: performanceConfig.gpuGi,
                  wet: performanceConfig.gpuWet,
                  waterShader: performanceConfig.gpuWaterShader,
                  waterWakes: performanceConfig.gpuWaterWakes,
                  heatShimmer: performanceConfig.gpuHeatShimmer,
                  fireLighting: performanceConfig.gpuFireLighting,
                  fogScattering: performanceConfig.gpuFogScattering,
                  exposure: performanceConfig.gpuExposure,
                  contrast: performanceConfig.gpuContrast,
                  saturation: performanceConfig.gpuSaturation,
                }
              );
              gpuCanvas.style.display = ok ? 'block' : 'none';
            } else {
              gpuCanvas.style.display = 'none';
            }
          }
        }
        const tRenderEnd = performance.now();

        // 11. Mini-map draws itself (see components/Minimap.tsx); only its last frame time is read here
        const tMinimapStart = 0;
        const tMinimapEnd = minimapFrameMsRef.current;

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

        // Push frame data to ring buffer only when profiler is open
        if (isPerfConsoleOpenRef.current) {
          perfHistoryRef.current.push({ ...performanceStatsRef.current });
          if (perfHistoryRef.current.length > 300) {
            perfHistoryRef.current.shift();
          }
        }

        // Trigger throttled state update for UI (only when profiler is open)
        perfUiTimerRef.current += dt;
        if (perfUiTimerRef.current >= 0.15) {
          perfUiTimerRef.current = 0;
          if (isPerfConsoleOpenRef.current) {
            setCurrentPerfStats({ ...performanceStatsRef.current });
          }
        }

        // Blackbox Flight Recorder Telemetry Snapshot (~2 Hz)
        telemetryTimerRef.current += dt;
        if (telemetryTimerRef.current >= 0.5) {
          telemetryTimerRef.current = 0;
          crashLogger.recordTelemetry({
            fps: computedFps,
            playerPos: {
              x: Math.round(player.x),
              y: Math.round(player.y),
              inVehicle: !!player.isInVehicle,
              vehicleId: player.currentVehicleId,
              floor: player.currentFloor || 0
            },
            entities: {
              vehicles: world.vehicles.length,
              pedestrians: world.pedestrians.length,
              particles: world.particles.length,
              skidMarks: world.skidMarks?.length || 0,
              stains: world.stains?.length || 0,
              groundItems: world.groundItems?.length || 0
            },
            audioState: {
              state: sound.getMuted() ? 'muted' : 'active',
              engineRunning: !!player.isInVehicle
            }
          });
        }
      } catch (loopErr) {
        const errMsg = loopErr instanceof Error ? loopErr.message : String(loopErr);
        const errStack = loopErr instanceof Error ? loopErr.stack : undefined;
        crashLogger.recordError('GameLoopError', errMsg, errStack);
      }
    }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    })
    .catch((err) => {
      console.error('[App] Unhandled error during game initialization:', err);
    }); // close loadMap().then()

    return () => {
      isMounted = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (cleanupListeners) cleanupListeners();
    };
  }, []); // Run only ONCE!

  useEffect(() => {
    const handleKeyActivated = (e: CustomEvent) => {
      const detail = e.detail || {};
      const apartmentId = detail.apartmentId || detail.item?.propertyId;
      const p = playerRef.current;
      if (!p || !apartmentId) return;
      const apt = getApartmentById(apartmentId);
      if (apt) {
        const res = toggleApartmentLock(p, apt);
        sound.playUseItem();
        addPlayerNotification(p, res.message, res.success ? 'heal' : 'warning');
        setVitalsRefreshTick(t => t + 1);
      }
    };

    const handleOpenPropDoc = (e: CustomEvent) => {
      const { item } = e.detail || {};
      if (item) {
        setSelectedPropertyDocItem(item);
        setIsPropertyDocumentModalOpen(true);
        sound.playPaperRustle();
      }
    };

    const handleOpenLimbTreatment = (e: CustomEvent) => {
      const { index = 0, item } = e.detail || {};
      if (item) {
        setTreatmentModalItem({ index, item });
      }
    };

    const handleOpenFurnitureStorage = (e: CustomEvent) => {
      const data = e.detail || { buildingId: 'b_test', floor: 0, furnitureIndex: 0, furnitureType: 'fridge', customTitle: 'Двухкамерный холодильник' };
      setFurnitureStorageData(data);
      setIsFurnitureStorageOpen(true);
    };

    window.addEventListener('apartment_key_activated' as any, handleKeyActivated as any);
    window.addEventListener('open_property_document_modal' as any, handleOpenPropDoc as any);
    window.addEventListener('open_limb_treatment_modal' as any, handleOpenLimbTreatment as any);
    window.addEventListener('open_furniture_storage_modal' as any, handleOpenFurnitureStorage as any);

    return () => {
      window.removeEventListener('apartment_key_activated' as any, handleKeyActivated as any);
      window.removeEventListener('open_property_document_modal' as any, handleOpenPropDoc as any);
      window.removeEventListener('open_limb_treatment_modal' as any, handleOpenLimbTreatment as any);
      window.removeEventListener('open_furniture_storage_modal' as any, handleOpenFurnitureStorage as any);
    };
  }, []);

  // --- TOGGLE TURN SIGNAL ---
  const toggleTurnSignal = (signal: 'left'| 'right'| 'hazard') => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;

    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;

    if (veh.turnSignal === signal) {
      veh.turnSignal = 'none';
      veh.turnSignalTimer = 0;
      setPlayerTurnSignal('none');
    } else {
      veh.turnSignal = signal;
      veh.turnSignalTimer = 0;
      setPlayerTurnSignal(signal);
      const turnCfg = getVehicleTurnSignalConfig(veh.type);
      const isHyperflash = (signal === 'left' && (veh.damage?.leftHeadlightBroken || veh.damage?.leftTaillightBroken)) ||
                           (signal === 'right' && (veh.damage?.rightHeadlightBroken || veh.damage?.rightTaillightBroken));
      sound.playTurnSignalTick(true, turnCfg.soundType, isHyperflash);
    }
  };

  // --- TOGGLE HEADLIGHT MODE (OFF / LOW BEAM / HIGH BEAM) ---
  const toggleHeadlights = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;

    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;

    const nextMode: 'off'| 'low'| 'high'=
      veh.headlightMode === 'off'? 'low': veh.headlightMode === 'low'? 'high': 'off';
    veh.headlightMode = nextMode;
    veh.headlightsOn = nextMode !== 'off';
    setPlayerHeadlightMode(nextMode);
  };

  const handleToggleFrontFogLights = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.frontFogLightsOn = !veh.frontFogLightsOn;
    sound.playButtonPress();
    addPlayerNotification(player, `Передние противотуманки (ПТФ): ${veh.frontFogLightsOn ? 'ВКЛ': 'ВЫКЛ'}`, veh.frontFogLightsOn ? 'info': 'warning');
    setVitalsRefreshTick((t) => t + 1);
  };

  const handleToggleRearFogLights = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.rearFogLightsOn = !veh.rearFogLightsOn;
    sound.playButtonPress();
    addPlayerNotification(player, `Задние противотуманные фонари: ${veh.rearFogLightsOn ? 'ВКЛ': 'ВЫКЛ'}`, veh.rearFogLightsOn ? 'info': 'warning');
    setVitalsRefreshTick((t) => t + 1);
  };

  const handleToggleRoadTrainLights = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.roadTrainLightsOn = veh.roadTrainLightsOn === false ? true : false;
    sound.playButtonPress();
    addPlayerNotification(
      player,
      `Огни автопоезда (крыша): ${veh.roadTrainLightsOn ? 'ВКЛ' : 'ВЫКЛ'}`,
      veh.roadTrainLightsOn ? 'info' : 'warning'
    );
    setVitalsRefreshTick((t) => t + 1);
  };

  const handleToggleAxleDiffLock = (axle: 'center' | 'rear' | 'front') => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    const res = toggleAxleDiffLock(veh, axle);
    if (res.success) {
      if (res.state) sound.playDiffLockEngage();
      else sound.playDiffLockDisengage();
    } else {
      sound.playDiffLockWarning();
    }
    addPlayerNotification(player, res.message, res.success ? 'info' : 'warning');
    setVitalsRefreshTick((t) => t + 1);
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

  const handleChangeHeaterMode = (mode: 'off'| 'low'| 'med'| 'high') => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.heaterMode = mode;
    sound.playUseItem();
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleAC = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.acOn = !veh.acOn;
    sound.playUseItem();
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleRecirc = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    veh.recircOn = !veh.recircOn;
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
      player.notifications.push({ id: 'eng_off_'+ Date.now(), text: 'Двигатель заглушен', color: '#fbbf24', timer: 2.5 });
    } else {
      // Check mechanical key requirement
      const requiredKey = getVehicleRequiredKeyType(veh);
      if (requiredKey && !veh.insertedKeyType) {
        sound.playButtonPress();
        if (!player.notifications) player.notifications = [];
        const keyName = requiredKey === 'gold'? 'Золотой ключ зажигания': 'Железный ключ зажигания';
        player.notifications.push({
          id: 'eng_no_key_'+ Date.now(),
          text: `В замке зажигания пусто. Возьмите ${keyName} в активную руку и активируйте его (ПКМ / удержание) или используйте из инвентаря.`,
          color: '#ef4444',
          timer: 4.5
        });
        return;
      }

      if (eng.hydrolocked) {
        sound.playCollision(0.25);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({
          id: 'eng_hydro_' + Date.now(),
          text: 'ГИДРОУДАР! В цилиндрах вода — стартер не может провернуть коленвал! Требуется слить воду и отремонтировать мотор ремкомплектом.',
          color: '#ef4444',
          timer: 4.5
        });
      } else if (eng.isSeized) {
        sound.playCollision(0.15);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_seized_'+ Date.now(), text: 'Двигатель заклинил при аварии! Запуск невозможен.', color: '#ef4444', timer: 3.5 });
      } else if ((eng.engineHealth ?? 100) <= 12) {
        sound.playCollision(0.15);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_dead_'+ Date.now(), text: 'Блок двигателя разрушен! Требуется ремонт.', color: '#ef4444', timer: 3.5 });
      } else if (!eng.starterWorking) {
        sound.playCollision(0.1);
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_starter_'+ Date.now(), text: 'Стартер разбит или поврежден!', color: '#ef4444', timer: 3.0 });
      } else if (eng.batteryInstalled === false) {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_nobat_'+ Date.now(), text: 'В машине отсутствует аккумулятор!', color: '#ef4444', timer: 3.0 });
      } else if (eng.batteryPosConnected === false || eng.batteryNegConnected === false) {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_term_'+ Date.now(), text: 'Клеммы аккумулятора отсоединены!', color: '#ef4444', timer: 3.0 });
      } else if (eng.batteryCharge <= 5) {
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_batt_'+ Date.now(), text: 'Аккумулятор разряжен в 0%!', color: '#ef4444', timer: 3.0 });
      } else if (eng.transmissionType === 'AUTO'&& eng.autoGearMode !== 'P'&& eng.autoGearMode !== 'N') {
        const isHydro = eng.transmissionKind === 'HYDRO' || isRoadMachinery(veh.type);
        sound.playButtonPress();
        if (!player.notifications) player.notifications = [];
        player.notifications.push({
          id: 'eng_inhibitor_'+ Date.now(),
          text: isHydro
            ? 'Блокиратор стартера (ГСТ)! Переведите рычаг хода в Нейтраль [Н].'
            : 'Блокиратор стартера (АКПП)! Запуск разрешён только в режиме P (Паркинг) или N (Нейтраль).',
          color: '#f59e0b',
          timer: 3.5
        });
      } else if (eng.transmissionType === 'MANUAL'&& eng.currentGear !== 0) {
        const jerkDir = eng.currentGear === -1 ? -1 : 1;
        const currentKmh = Math.abs(veh.speed) * PX_S_TO_SPEED_KMH;
        const isRollingFast = currentKmh >= 18.0 && (veh.speed * jerkDir > 0);

        // Bump-start on the move (Запуск с толкача) if already rolling fast in matching direction
        if (isRollingFast) {
          eng.starterOverloadCount = 0;
          eng.engineRunning = true;
          eng.engineStalled = false;
          eng.isStalled = false;
          sound.startEngine();
          if (!player.notifications) player.notifications = [];
          player.notifications.push({
            id: 'eng_bump_'+ Date.now(),
            text: 'Запуск с толкача! Двигатель успешно запущен с хода на передаче.',
            color: '#34d399',
            timer: 2.5
          });
          setVitalsRefreshTick(t => t + 1);
          return;
        }

        // Heavy drain on battery when cranking drivetrain on gear
        eng.batteryCharge = Math.max(0, (eng.batteryCharge ?? 100) - 12);
        if (eng.batteryCharge <= 5) {
          sound.playCollision(0.1);
          if (!player.notifications) player.notifications = [];
          player.notifications.push({
            id: 'eng_lowbat_lurch_'+ Date.now(),
            text: 'Не хватает заряда разряженного аккумулятора прокрутить трансмиссию на передаче!',
            color: '#ef4444',
            timer: 3.5
          });
          return;
        }

        // Starter overload check: spamming starter on gear burns out starter motor
        eng.starterOverloadCount = (eng.starterOverloadCount || 0) + 1;
        if (eng.starterOverloadCount >= 4) {
          eng.starterWorking = false;
          sound.playCollision(0.75);
          if (!player.notifications) player.notifications = [];
          player.notifications.push({
            id: 'eng_starter_burn_'+ Date.now(),
            text: 'СТАРТЕР СГОРЕЛ! Перегрузка электромотора при попытке ехать на стартере на передаче!',
            color: '#ef4444',
            timer: 4.5
          });
          return;
        }

        // Brief physical shudder from starter motor cranking against wheels and transmission
        const jerk = Math.min(2.5, 2.5 / (eng.starterOverloadCount || 1));
        veh.speed = jerk * jerkDir;
        veh.vx = Math.cos(veh.angle) * veh.speed;
        veh.vy = Math.sin(veh.angle) * veh.speed;

        eng.engineRunning = false;
        eng.isStalled = true;
        eng.engineStalled = true;
        eng.engineRPM = 0;
        sound.playCollision(0.35);
        sound.playEngineStall();
        if (!player.notifications) player.notifications = [];
        player.notifications.push({
          id: 'eng_lurch_'+ Date.now(),
          text: `Рывок на передаче! (${eng.starterOverloadCount}/4) Запуск на передаче невозможен — машина дёрнулась от стартера и заглохла. Для запуска включите нейтраль [N]!`,
          color: '#ef4444',
          timer: 3.5
        });
      } else {
        eng.starterOverloadCount = 0; // Reset overload count on clean start
        eng.engineRunning = true;
        eng.engineStalled = false;
        eng.isStalled = false;
        if (eng.engineRPM < 800) {
          eng.engineRPM = 850;
        }
        sound.startEngine();
        if (!player.notifications) player.notifications = [];
        player.notifications.push({ id: 'eng_on_'+ Date.now(), text: 'Двигатель запущен', color: '#34d399', timer: 2.5 });
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
    const msg = veh.windowOpen ? 'Окно приоткрыто (сквозняк выравнивает влажность)': 'Окно закрыто';
    if (!player.notifications) player.notifications = [];
    player.notifications.push({
      id: 'win_'+ Date.now(),
      text: msg,
      color: '#38bdf8',
      timer: 2.5
    });
    setVitalsRefreshTick(t => t + 1);
  };

  const handleToggleTrailerHitch = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player.isInVehicle || !player.currentVehicleId) return;
    const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
    if (!veh) return;
    toggleTrailerHitch(veh, world, {
      add: (msg: string, type: 'info'| 'warning'| 'success') => addPlayerNotification(player, msg, type === 'success'? 'info': type)
    });
    setVitalsRefreshTick(t => t + 1);
  };

  // --- MANUAL & AUTOMATIC GEAR SELECTOR HANDLER ---
  const handleSelectGear = (newGear: 'P'| 'R'| 'N'| 'D'| number | string) => {
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
        id: 'trans_jam_'+ Date.now(),
        text: 'Коробка передач заклинила в результате аварии!',
        color: '#ef4444',
        timer: 3.0,
      });
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    if (newGear === 'RANGE_I'|| newGear === 'RANGE_II') {
      const r = newGear === 'RANGE_I'? 1 : 2;
      eng.tractorRange = r;
      eng.currentGear = 0; // Neutral while range is engaged
      eng.shiftCooldown = 0.55;
      setGear('N');
      sound.playGearShift();
      if (!player.notifications) player.notifications = [];
      player.notifications.push({
        id: 'range_'+ Date.now(),
        text: `МТЗ: Включен ${r === 1 ? 'I Диапазон (Медленный)': 'II Диапазон (Скоростной)'}`,
        color: r === 1 ? '#f59e0b': '#38bdf8',
        timer: 1.8,
      });
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    const isHydro = eng.transmissionKind === 'HYDRO' || isRoadMachinery(veh.type);
    if (isHydro) {
      const maxHydroForward = Math.max(1, (eng.gearRatios?.length || 4) - 2);
      const raw = typeof newGear === 'string' ? newGear.toUpperCase() : newGear;
      let targetMode: 'R' | 'N' | 'D' = 'N';
      let targetGear = 0;
      let uiGear = 'N';
      let label = 'ГСТ: Нейтраль [Н]';
      let color = '#f59e0b';

      if (raw === 'R' || raw === 'З' || raw === -1) {
        targetMode = 'R';
        targetGear = -1;
        uiGear = 'R';
        label = 'ГСТ: Задний ход [З]';
        color = '#f43f5e';
      } else if (raw === 'N' || raw === 'P' || raw === 'Н' || raw === 0) {
        targetMode = 'N';
        targetGear = 0;
        uiGear = 'N';
        label = 'ГСТ: Нейтраль [Н]';
        color = '#f59e0b';
      } else if (raw === 2 || raw === '2' || raw === 'Т' || raw === 'ТР') {
        targetMode = 'D';
        targetGear = Math.min(maxHydroForward, 2);
        uiGear = String(targetGear);
        label = targetGear >= 2 ? 'ГСТ: Транспортная [Т / 2]' : 'ГСТ: Рабочая [Р / 1]';
        color = '#38bdf8';
      } else if (raw === 1 || raw === '1' || raw === 'Р' || raw === 'РАБ') {
        targetMode = 'D';
        targetGear = 1;
        uiGear = '1';
        label = 'ГСТ: Рабочая [Р / 1]';
        color = '#34d399';
      } else {
        targetMode = 'D';
        targetGear = Math.max(1, Math.min(maxHydroForward, eng.currentGear || 1));
        uiGear = String(targetGear);
        label = targetGear >= 2 ? 'ГСТ: Транспортная [Т / 2]' : 'ГСТ: Рабочая [Р / 1]';
        color = targetGear >= 2 ? '#38bdf8' : '#34d399';
      }

      eng.autoGearMode = targetMode;
      eng.currentGear = targetGear;
      eng.shiftCooldown = 0.25;
      setGear(uiGear);
      sound.playGearShift();
      if (!player.notifications) player.notifications = [];
      player.notifications.push({
        id: 'gear_' + Date.now(),
        text: label,
        color,
        timer: 1.5,
      });
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    if (typeof newGear === 'string'&& ['P', 'R', 'N', 'D'].includes(newGear.toUpperCase())) {
      const mode = newGear.toUpperCase() as 'P'| 'R'| 'N'| 'D';
      eng.autoGearMode = mode;
      eng.shiftCooldown = 0.55;
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
        id: 'gear_'+ Date.now(),
        text: `АКПП: Режим [${mode}]`,
        color: mode === 'P'? '#ef4444': mode === 'R'? '#f59e0b': mode === 'N'? '#94a3b8': '#38bdf8',
        timer: 1.5,
      });
    } else if (typeof newGear === 'number'|| newGear === 'R'|| newGear === 'N') {
      const g = newGear === 'R'? -1 : newGear === 'N'? 0 : Number(newGear);
      eng.currentGear = g;
      eng.shiftCooldown = 0.55; // Smooth clutch engagement window so the player doesn't instantly stall
      if (veh.type.startsWith('tractor_')) {
        if ([1, 2, 4, 5].includes(g)) eng.tractorRange = 1;
        else if ([3, 6, 7, 8].includes(g)) eng.tractorRange = 2;
      }
      setGear(g === -1 ? 'R': g === 0 ? 'N': String(g));
      sound.playGearShift();
      if (!player.notifications) player.notifications = [];
      const rangeText = (veh.type.startsWith('tractor_') && eng.tractorRange && g > 0 && g < 9)
        ? `(${eng.tractorRange === 1 ? 'I диапазон': 'II диапазон'})`: '';
      player.notifications.push({
        id: 'gear_'+ Date.now(),
        text: `МКПП: Передача [${g === -1 ? 'R': g === 0 ? 'N': g}]${rangeText}`,
        color: '#38bdf8',
        timer: 1.5,
      });
    }
    setVitalsRefreshTick(t => t + 1);
  };

  // --- ENTER / EXIT VEHICLE HANDLER ---
  const handleEnterExitVehicle = (targetVehicle?: Vehicle) => {
    const world = worldRef.current;
    const player = playerRef.current;
    // Cancel any active placement mode on entering/exiting vehicle
    if (activePlacementRef.current) {
      setActivePlacement(null);
      activePlacementRef.current = null;
    }

    if (player.isInVehicle) {
      // Exit current vehicle
      const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
      if (veh) {
        veh.isPlayerControlled = false;
        const isMoving = Math.abs(veh.speed) > 0.5;
        veh.isParked = !isMoving;
        if (!isMoving) {
          veh.speed = 0;
          veh.vx = 0;
          veh.vy = 0;
        }

        // If player was in crane operator cab, exit beside turntable ladder
        if (player.craneOperatorActive) {
          player.craneOperatorActive = false;
          veh.craneOperatorActive = false;
          veh.craneControlMode = false;
          if (isVehicleCraneTruck(veh)) {
            const cGeom = getVehicleCraneGeometry(veh);
            const cosT = Math.cos(cGeom.turretAngle);
            const sinT = Math.sin(cGeom.turretAngle);
            const cabLocalX = cGeom.turretLocalX + 1.1 * cosT - (-8.8) * sinT;
            const cabLocalY = 1.1 * sinT + (-8.8) * cosT;
            const cosV = Math.cos(veh.angle);
            const sinV = Math.sin(veh.angle);
            player.x = veh.x + (cabLocalX - 4) * cosV - (cabLocalY - 12) * sinV;
            player.y = veh.y + (cabLocalX - 4) * sinV + (cabLocalY - 12) * cosV;
          }
          addPlayerNotification(player, 'Вы спустились из кабины крановщика на землю.', 'info');
        } else {
          if (isExcavatorVehicle(veh)) {
            veh.exOperatorMode = false;
            inputRef.current.exSlewLeft = false;
            inputRef.current.exSlewRight = false;
            inputRef.current.exBoomUp = false;
            inputRef.current.exBoomDown = false;
            inputRef.current.exStickOut = false;
            inputRef.current.exStickIn = false;
            inputRef.current.exBucketCurl = false;
            inputRef.current.exBucketDump = false;
            inputRef.current.exBladeUp = false;
            inputRef.current.exBladeDown = false;
            inputRef.current.exStabilizersDown = false;
            inputRef.current.exStabilizersUp = false;
          }
          // Position player to driver-side door
          const doorAngle = veh.angle - Math.PI / 2;
          player.x = veh.x + Math.cos(doorAngle) * (veh.width / 2 + 18);
          player.y = veh.y + Math.sin(doorAngle) * (veh.width / 2 + 18);
        }

        player.vx = 0;
        player.vy = 0;
        player.isInVehicle = false;
        player.currentVehicleId = null;

        setIsInVehicle(false);
        setActiveCarName('');
        setSpeedKmh(0);
        setPlayerTurnSignal('none');
        
        // Note: engine running state and current gear are preserved on the vehicle object
        sound.stopEngine();
        sound.playCarDoor();
      }
    } else {
      // Prefer explicitly pointed vehicle; fallback to closest within radius
      let closestVeh: Vehicle | null = targetVehicle
        ? (world.vehicles.find((v) => v.id === targetVehicle.id) || targetVehicle)
        : null;

      if (!closestVeh) {
        let minDist = 85;
        for (const veh of world.vehicles) {
          const dist = Math.hypot(veh.x - player.x, veh.y - player.y);
          if (dist < minDist) {
            minDist = dist;
            closestVeh = veh;
          }
        }
      }

      if (closestVeh) {
        if (closestVeh.type.startsWith('trailer_') || closestVeh.isTrailer) {
          sound.playAlert();
          addPlayerNotification(player, 'Прицеп не имеет двигателя или кабины. Подцепите его к трактору или фаркопу машины.', 'warning');
          return;
        }

        const canUnlock = playerHasKeyForVehicle(player, closestVeh);
        if (closestVeh.isLocked) {
          if (canUnlock) {
            closestVeh.isLocked = false;
            sound.playCarDoor();
            const cfg = CAR_CONFIGS[closestVeh.type] || CAR_CONFIGS.sedan;
            addPlayerNotification(player, `Двери (${cfg.name}) отперты ключом.`, 'pickup');
          } else {
            sound.playAlert();
            addPlayerNotification(player, 'Двери автомобиля заперты. Возьмите ключ в активную руку (ПКМ / удержание) или используйте отмычку.', 'warning');
            return;
          }
        }

        if ((closestVeh as any).isUnderRepair) {
          sound.playAlert();
          addPlayerNotification(player, 'Автомобиль на подъемнике! Идут технические работы, вход заблокирован.', 'warning');
          return;
        }

        closestVeh.steerAngle = typeof closestVeh.steerAngle === 'number'&& Number.isFinite(closestVeh.steerAngle) ? closestVeh.steerAngle : 0;
        closestVeh.angle = typeof closestVeh.angle === 'number'&& Number.isFinite(closestVeh.angle) ? closestVeh.angle : 0;
        closestVeh.speed = typeof closestVeh.speed === 'number'&& Number.isFinite(closestVeh.speed) ? closestVeh.speed : 0;
        closestVeh.vx = typeof closestVeh.vx === 'number'&& Number.isFinite(closestVeh.vx) ? closestVeh.vx : 0;
        closestVeh.vy = typeof closestVeh.vy === 'number'&& Number.isFinite(closestVeh.vy) ? closestVeh.vy : 0;

        if (!closestVeh.engineState) {
          closestVeh.engineState = createDefaultEngineState(closestVeh.type, false, true);
          if (!closestVeh.fuelSystem) closestVeh.fuelSystem = createDefaultFuelSystem(closestVeh.type, !!closestVeh.isParked);
          applyPowertrain(closestVeh);
        }

        closestVeh.isPlayerControlled = true;
        closestVeh.isParked = false;
        setPlayerHeadlightMode(closestVeh.headlightMode || 'off');
        setPlayerTurnSignal(closestVeh.turnSignal || 'none');
        closestVeh.aiState = 'driving';
        
        const eng = closestVeh.engineState;
        if (eng) {
          if (eng.engineRunning) {
            eng.isStalled = false;
            eng.engineStalled = false;
            if (eng.engineRPM < 800) {
              eng.engineRPM = 850;
            }
            sound.startEngine();
          } else {
            sound.stopEngine();
          }

          const isHydro = eng.transmissionKind === 'HYDRO' || isRoadMachinery(closestVeh.type);
          if (isHydro) {
            if (eng.autoGearMode === 'P') {
              eng.autoGearMode = 'N';
              eng.currentGear = 0;
            }
            if (eng.autoGearMode === 'R' || eng.currentGear === -1) setGear('R');
            else if (eng.autoGearMode === 'N' || eng.currentGear === 0) setGear('N');
            else setGear((eng.currentGear ?? 1) >= 2 ? '2' : '1');
          } else if (eng.transmissionType === 'AUTO') {
            const mode = eng.autoGearMode || 'P';
            setGear(mode);
          } else {
            const g = eng.currentGear ?? 0;
            setGear(g === -1 ? 'R': g === 0 ? 'N': String(g));
          }
        } else {
          setGear('N');
        }

        player.isInVehicle = true;
        player.currentVehicleId = closestVeh.id;
        player.x = closestVeh.x;
        player.y = closestVeh.y;

        setIsInVehicle(true);
        const cfg = CAR_CONFIGS[closestVeh.type] || CAR_CONFIGS.sedan;
        setActiveCarName(cfg?.name || 'Автомобиль');
        sound.playCarDoor();
      }
    }
  };

  // --- UNIFIED CONTEXT PHYSICAL INTERACTION EXECUTOR ---
  const handleExecuteActiveInteraction = (targetOverride?: InteractionTarget | null) => {
    const target = targetOverride || activeInteractionRef.current;
    if (!target) return;

    const p = playerRef.current;
    const world = worldRef.current;
    const camera = cameraRef.current;
    if (!p || !world || !camera) return;

    switch (target.type) {
      case 'enter_bus_saloon': {
        const busData = target.data?.bus || target.data;
        const door = target.data?.door;
        const bus = busData as Vehicle;
        if (bus) {
          setFadeActive(true);
          sound.playCarDoor();

          p.insideBusId = bus.id;
          p.sittingState = null;
          world.player = p;

          const cos = Math.cos(bus.angle);
          const sin = Math.sin(bus.angle);
          if (door) {
            p.busLocalX = door.vestibuleLocalX;
            p.busLocalY = door.vestibuleLocalY;
          } else {
            p.busLocalX = bus.length / 2 - 14;
            p.busLocalY = 5.5;
          }

          p.x = bus.x + p.busLocalX * cos - p.busLocalY * sin;
          p.y = bus.y + p.busLocalX * sin + p.busLocalY * cos;
          p.vx = 0;
          p.vy = 0;

          camera.shakeTimer = 0;
          camera.shakeIntensity = 0;
          camera.x = p.x;
          camera.y = p.y;
          camera.targetX = p.x;
          camera.targetY = p.y;
          camera.zoom = 2.4 * userZoomFactorRef.current;
          camera.targetZoom = 2.4 * userZoomFactorRef.current;

          setTimeout(() => {
            setFadeActive(false);
          }, 180);
        }
        break;
      }

      case 'exit_bus_saloon': {
        const bus = (world.vehicles || []).find(v => v.id === p.insideBusId);
        const exitDoor = target.data?.door as { exitLocalX?: number; exitLocalY?: number } | undefined;
        if (bus) {
          setFadeActive(true);
          sound.playCarDoor();

          const cos = Math.cos(bus.angle);
          const sin = Math.sin(bus.angle);
          const exitLocalX = exitDoor?.exitLocalX ?? p.busLocalX ?? (bus.length / 2 - 14);
          const exitLocalY = exitDoor?.exitLocalY ?? (bus.width / 2 + 7);

          p.insideBusId = null;
          p.sittingState = null;
          world.player = p;

          p.x = bus.x + exitLocalX * cos - exitLocalY * sin;
          p.y = bus.y + exitLocalX * sin + exitLocalY * cos;
          p.vx = 0;
          p.vy = 0;

          p.busLocalX = undefined;
          p.busLocalY = undefined;

          camera.x = p.x;
          camera.y = p.y;
          camera.targetX = p.x;
          camera.targetY = p.y;
          camera.zoom = 1.3 * userZoomFactorRef.current;
          camera.targetZoom = 1.3 * userZoomFactorRef.current;

          setTimeout(() => {
            setFadeActive(false);
          }, 180);
        } else {
          p.insideBusId = null;
          p.sittingState = null;
        }
        break;
      }

      case 'sit_seat': {
        if (target.data) {
          sitPlayerOnSeat(p, target.data);
          world.player = p;
        }
        break;
      }

      case 'stand_up': {
        standPlayerUp(p);
        world.player = p;
        break;
      }

      case 'enter_passenger_car': {
        const carData = target.data?.car || target.data;
        const door = target.data?.door;
        const car = carData as RollingStockCar;
        if (car) {
          setFadeActive(true);
          sound.playCarDoor();
          
          // Instantly assign inside state so collision physics treats the player as inside carriage
          p.insideCarId = car.id;
          world.player = p;

          // Place player in local coordinates relative to the carriage inside the entered vestibule
          const cos = Math.cos(car.angle);
          const sin = Math.sin(car.angle);
          if (door) {
            p.carLocalX = door.vestibuleLocalX;
            p.carLocalY = door.vestibuleLocalY;
          } else {
            const cScale = (car.width || 30) / 60;
            p.carLocalX = car.length / 2 - 19 * cScale;
            p.carLocalY = 0;
          }

          // Immediately compute player world position inside the carriage
          p.x = car.x + p.carLocalX * cos - p.carLocalY * sin;
          p.y = car.y + p.carLocalX * sin + p.carLocalY * cos;
          p.vx = 0;
          p.vy = 0;

          // Clear any trauma camera shake or panic jitter from standing near tracks
          camera.shakeTimer = 0;
          camera.shakeIntensity = 0;
          camera.x = p.x;
          camera.y = p.y;
          camera.targetX = p.x;
          camera.targetY = p.y;
          camera.zoom = 2.4 * userZoomFactorRef.current;
          camera.targetZoom = 2.4 * userZoomFactorRef.current;

          setTimeout(() => {
            setFadeActive(false);
          }, 180);
        }
        break;
      }

      case 'exit_passenger_car': {
        const car = (world.rollingStock || []).find(c => c.id === p.insideCarId);
        if (car) {
          setFadeActive(true);
          sound.playCarDoor();
          
          const cos = Math.cos(car.angle);
          const sin = Math.sin(car.angle);
          
          // Exit player to the side of the carriage at that specific vestibule door
          const cScale = (car.width || 30) / 60;
          const exitLocalX = p.carLocalX ?? (car.length / 2 - 19 * cScale);
          const exitLocalY = target.data?.exitLocalY ?? ((p.carLocalY ?? 0) <= 0 ? -car.width / 2 - 7 : car.width / 2 + 7);

          p.insideCarId = null;
          world.player = p;

          p.x = car.x + exitLocalX * cos - exitLocalY * sin;
          p.y = car.y + exitLocalX * sin + exitLocalY * cos;
          p.vx = 0;
          p.vy = 0;

          p.carLocalX = undefined;
          p.carLocalY = undefined;

          camera.x = p.x;
          camera.y = p.y;
          camera.targetX = p.x;
          camera.targetY = p.y;
          camera.zoom = 1.3 * userZoomFactorRef.current;
          camera.targetZoom = 1.3 * userZoomFactorRef.current;

          setTimeout(() => {
            setFadeActive(false);
          }, 180);
        } else {
          p.insideCarId = null;
        }
        break;
      }

      case 'enter_vehicle':
        handleEnterExitVehicle(target.data as Vehicle | undefined);
        break;

      case 'exit_vehicle':
        handleEnterExitVehicle();
        break;

      case 'enter_crane_cab': {
        const veh = (target.data && target.data.id) ? (world.vehicles.find(v => v.id === target.data.id) || target.data) : null;
        if (veh) {
          p.isInVehicle = true;
          p.currentVehicleId = veh.id;
          p.craneOperatorActive = true;
          veh.craneOperatorActive = true;
          veh.craneControlMode = true;
          veh.isPlayerControlled = true;
          setIsInVehicle(true);
          sound.playCarDoor();
          addPlayerNotification(p, 'Вы заняли рабочее место крановщика КС-3577 (кабина на поворотной платформе)', 'info');
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'exit_crane_cab':
        handleEnterExitVehicle();
        break;

      case 'crane_outriggers_panel': {
        const veh = (target.data && target.data.id) ? (world.vehicles.find(v => v.id === target.data.id) || target.data) : null;
        if (veh) {
          setCraneOutriggersVehicle(veh);
          setIsCraneOutriggersModalOpen(true);
          sound.playUseItem();
        }
        break;
      }

      case 'enter_building': {
        const { bld, ent } = target.data;
        if (bld) {
          setFadeActive(true);
          sound.playCarDoor();
          setTimeout(() => {
            p.isInsideBuilding = true;
            p.insideBuildingId = bld.id;
            p.currentFloor = 0;
            p.insideEntranceNumber = ent ? ent.number : 1;
            const layout = getBuildingLayout(bld, 0);
            const exits = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
            
            // Map the entrance number (1-indexed) to the exits array index!
            const entIdx = (p.insideEntranceNumber || 1) - 1;
            const exitZone = exits[entIdx] || exits[0] || layout.exitZone || { x: 10, y: 10, width: 20, height: 10 };
            
            let enterX = exitZone.x + exitZone.width / 2;
            let enterY = exitZone.y + exitZone.height / 2;
            if (exitZone.x <= 10) {
              enterX = exitZone.x + exitZone.width + 12;
            } else if (exitZone.x >= layout.width - 20) {
              enterX = exitZone.x - 12;
            } else if (exitZone.y <= 10) {
              enterY = exitZone.y + exitZone.height + 12;
            } else {
              enterY = exitZone.y - 12;
            }
            let newPX = bld.x + enterX;
            let newPY = bld.y + enterY;
            if (!Number.isFinite(newPX)) newPX = bld.x + layout.width / 2;
            if (!Number.isFinite(newPY)) newPY = bld.y + layout.height / 2;
            p.x = newPX;
            p.y = newPY;
            cameraRef.current.x = newPX;
            cameraRef.current.y = newPY;
            cameraRef.current.targetX = newPX;
            cameraRef.current.targetY = newPY;
            setTimeout(() => {
              setFadeActive(false);
            }, 150);
          }, 200);
        }
        break;
      }

      case 'exit_building': {
        const bld = (target.data && target.data.id) ? target.data : world.buildings.find(b => b.id === p.insideBuildingId);
        if (bld) {
          setFadeActive(true);
          sound.playCarDoor();
          setTimeout(() => {
            p.isInsideBuilding = false;
            p.insideBuildingId = null;
            p.isInsideApartment = false;
            p.insideApartmentId = null;
            p.currentFloor = 0;
            
            const ents = getAllBuildingEntrances(bld);
            const entNum = p.insideEntranceNumber || 1;
            const exitEnt = ents.find(e => e.number === entNum) || ents[0] || { x: bld.x + bld.width / 2, y: bld.y + bld.height + 14, side: 'south'as const };
            p.insideEntranceNumber = null; // Clear entrance tracking on exit
            
            let exitX = exitEnt.x;
            let exitY = exitEnt.y + 14;
            if (exitEnt.side === 'north') {
              exitY = exitEnt.y - 14;
            } else if (exitEnt.side === 'south') {
              exitY = exitEnt.y + 14;
            } else if (exitEnt.side === 'west') {
              exitX = exitEnt.x - 14;
              exitY = exitEnt.y;
            } else if (exitEnt.side === 'east') {
              exitX = exitEnt.x + 14;
              exitY = exitEnt.y;
            }
            if (!Number.isFinite(exitX)) exitX = bld.x + bld.width / 2;
            if (!Number.isFinite(exitY)) exitY = bld.y + bld.height + 14;
            p.x = exitX;
            p.y = exitY;
            cameraRef.current.x = exitX;
            cameraRef.current.y = exitY;
            cameraRef.current.targetX = exitX;
            cameraRef.current.targetY = exitY;
            setTimeout(() => {
              setFadeActive(false);
            }, 150);
          }, 200);
        }
        break;
      }

      case 'open_hood': {
        const v = target.data as Vehicle;
        if (v && v.engineState) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.9);
          v.engineState.hoodOpen = true;
          setEngineBayVehicle(v);
          setIsEngineBayOpen(true);
          sound.playUseItem();
          addPlayerNotification(p, `Открыт капот (${CAR_CONFIGS[v.type]?.name || v.type})`, 'info');
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'fuel_insert': {
        const nearbyVeh = target.data as Vehicle;
        const pump = world.gasPumps?.find(gp => gp.id === p.heldFuelNozzle?.pumpId);
        if (nearbyVeh && pump && p.heldFuelNozzle) {
          const nozzleFuelType = p.heldFuelNozzle.fuelType;
          const success = insertNozzleIntoVehicle(p, nearbyVeh, pump, world);
          if (success) {
            triggerPlayerActionAnim(p, 'fuel_nozzle_use', 0.85);
            const grade = FUEL_GRADES[nozzleFuelType];
            const vehName = CAR_CONFIGS[nearbyVeh.type]?.name || nearbyVeh.type;
            addPlayerNotification(p, `Топливный пистолет [${grade?.nameRu || ''}] вставлен в бак (${vehName}). Пройдите в кассу АЗС для оплаты.`, 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
          }
        }
        break;
      }

      case 'fuel_remove': {
        const { vehicle, pump } = target.data;
        if (pump && pump.isPumping) {
          addPlayerNotification(p, 'Идет процесс подачи топлива! Дождитесь окончания заправки.', 'warning');
          return;
        }
        if (vehicle && pump) {
          triggerPlayerActionAnim(p, 'fuel_nozzle_use', 0.85);
          removeNozzleFromVehicle(p, vehicle, pump, world);
          addPlayerNotification(p, `Топливный пистолет извлечен из бака. Повесьте его обратно на колонку №${pump.pumpNumber}.`, 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'pump_take_nozzle': {
        const pump = target.data as GasPumpDispenser;
        if (pump.isPumping) {
          addPlayerNotification(p, `Колонка №${pump.pumpNumber} в процессе подачи топлива.`, 'info');
          return;
        }
        triggerPlayerActionAnim(p, 'fuel_nozzle_use', 0.85);
        setActiveGasPump(pump);
        setIsFuelNozzleModalOpen(true);
        sound.playUseItem();
        break;
      }

      case 'pump_return_nozzle': {
        const pump = target.data as GasPumpDispenser;
        if (pump) {
          triggerPlayerActionAnim(p, 'fuel_nozzle_use', 0.85);
          returnNozzleToPump(p, pump);
          addPlayerNotification(p, `Топливный пистолет возвращен на колонку №${pump.pumpNumber}.`, 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'gas_cashier': {
        const gasBld = world.buildings.find(
          (b) => b.shopBrand === 'gas_station_shop' || b.type === 'gas_station_shop' || b.id === 'bld_gas_station_shop_se'
        );
        setShopType('gas_station_shop');
        setShopTitle(gasBld?.nameRu || 'АЗС «НЕФТЬМАГИСТРАЛЬ» 24/7');
        setShopBuildingId(gasBld?.id || 'bld_gas_station_shop_se');
        setShopRoomName(null);
        setIsShopOpen(true);
        sound.playUseItem();
        break;
      }

      case 'water_hose_take': {
        const rawData = target.data as Vehicle | { veh: Vehicle; hoseMode?: 'vacuum' | 'jetter' };
        const veh = rawData && 'veh' in rawData ? rawData.veh : rawData;
        const requestedMode = rawData && 'hoseMode' in rawData ? rawData.hoseMode : undefined;
        if (requestedMode && veh?.fluidTank) {
          veh.fluidTank.activeHoseMode = requestedMode;
        }
        triggerPlayerActionAnim(p, 'water_hose_use', 0.9);
        takeWaterHose(p, veh, world);
        const isVac = !!veh.fluidTank?.isVacuumTank || veh.type === 'trailer_vacuum';
        const isJetter = !!p.heldWaterHose?.isJetterHose;
        if (isJetter) {
          addPlayerNotification(p, 'Каналопромывочный рукав РВД размотан с барабана КО-560. Включите КОМ и насос ВД для промывки.', 'info');
        } else if (isVac) {
          const gateState = veh.fluidTank?.drainValveOpen ? 'Шибер АНМ-53 открыт.' : 'Откройте заднюю шиберную задвижку АНМ-53 и создайте вакуум насосом.';
          addPlayerNotification(p, `Заборный вакуумный рукав d=100 мм снят с пенала. ${gateState}`, 'info');
        } else {
          const sourceName = veh.type === 'truck_water' ? 'насосной станции водовоза' : 'крана бочки-цистерны';
          addPlayerNotification(p, `Шланг размотан с ${sourceName}. Зажмите ЛКМ для подачи воды.`, 'info');
        }
        sound.playUseItem();
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'water_hose_stow': {
        const wasVac = !!p.heldWaterHose?.isVacuumHose;
        triggerPlayerActionAnim(p, 'water_hose_use', 0.9);
        stowWaterHose(p, world);
        addPlayerNotification(
          p,
          wasVac
            ? 'Вакуумный гофрорукав уложен в боковой пенал.'
            : 'Рукав смотан и закреплён на штатное место.',
          'info'
        );
        sound.playUseItem();
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'vacuum_gate_valve_toggle': {
        const veh = target.data as Vehicle;
        if (veh?.fluidTank) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.95);
          veh.fluidTank.drainValveOpen = !veh.fluidTank.drainValveOpen;
          sound.playHydraulicHiss(0.2);
          addPlayerNotification(
            p,
            veh.fluidTank.drainValveOpen
              ? 'Задняя шиберная задвижка АНМ-53 открыта.'
              : 'Задняя шиберная задвижка АНМ-53 закрыта.',
            'info'
          );
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'vacuum_pump_panel': {
        const veh = (target.data && target.data.id) ? (world.vehicles.find(v => v.id === target.data.id) || target.data) : null;
        if (veh?.fluidTank) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.85);
          setVacuumPumpVehicle(veh);
          setIsVacuumPumpModalOpen(true);
          sound.playUseItem();
        }
        break;
      }

      case 'vacuum_hose_mode_toggle': {
        const veh = target.data as Vehicle;
        if (veh?.fluidTank) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.85);
          const cur = veh.fluidTank.activeHoseMode ?? 'vacuum';
          veh.fluidTank.activeHoseMode = cur === 'vacuum' ? 'jetter' : 'vacuum';
          sound.playButtonPress();
          addPlayerNotification(
            p,
            veh.fluidTank.activeHoseMode === 'jetter'
              ? 'Выбран задний барабан РВД высокого давления (каналопромывка чистой водой).'
              : 'Выбран заборный вакуумный гофрорукав d=100 мм (откачка ила).',
            'info'
          );
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'tow_rope_detach': {
        const data = target.data;
        triggerPlayerActionAnim(p, 'pickup', 0.75);
        if (data && data.isDragging) {
          // Cancel player dragging rope
          p.heldTowRope = null;
          addPlayerNotification(p, 'Буксировочный трос отцеплен и убран.', 'info');
          sound.playUseItem();
        } else if (data) {
          // Detaching a connected rope from world.towingRopes
          const { rope } = data;
          if (rope && world.towingRopes) {
            world.towingRopes = world.towingRopes.filter(r => r.id !== rope.id);
            
            // Return tow_rope item to player
            const towItem = createItem('tow_rope', 1);
            const added = addItemToPlayer(p, towItem);
            if (!added) {
              if (!world.groundItems) world.groundItems = [];
              world.groundItems.push({
                id: `ground_tow_rope_${Date.now()}`,
                x: p.x,
                y: p.y,
                item: towItem
              });
            }
            addPlayerNotification(p, 'Буксировочный трос отцеплен и смотан.', 'info');
            sound.playUseItem();
          }
        }
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'building_elevator': {
        const { bld, sz } = target.data;
        const isStairs = (target.actionTitle && target.actionTitle.includes('Лестн')) || (target.detail && target.detail.includes('Лестн'));
        setActiveElevatorMenu({
          bldId: bld.id,
          bldName: bld.nameRu || 'Здание',
          currentFloor: p.currentFloor || 0,
          maxFloors: getBuildingFloorsCount(bld),
          type: isStairs ? 'stairs' : 'elevator'
        });
        sound.playUseItem();
        break;
      }

      case 'building_shop': {
        const { zone, bld } = target.data;
        if (bld.type === 'car_dealership'|| bld.shopBrand === 'car_dealership') {
          setIsDealershipOpen(true);
          sound.playUseItem();
          return;
        }
        let resolvedType: CityShop['type'] = zone.shopType || 'supermarket';
        let resolvedTitle = target.data.shopTitle || bld.nameRu || 'Магазин';
        setShopType(resolvedType);
        setShopTitle(resolvedTitle);
        setShopBuildingId(bld.id || null);
        setShopRoomName(target.data.shopTitle || null);
        setIsShopOpen(true);
        sound.playUseItem();
        break;
      }

      case 'pickup_item': {
        const gi = target.data as GroundItem;
        if (gi) {
          pickupGroundItem(p, world, gi);
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'pickup_litter': {
        if (pickupNearbyLitter(p, world)) {
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'eco_recycle': {
        const activeHand = p.activeHand || 'right';
        const activeHandItem = activeHand === 'left' ? p.leftHandItem : p.rightHandItem;
        if (
          activeHandItem &&
          (activeHandItem.category === 'drink' ||
            activeHandItem.itemId.includes('bottle') ||
            activeHandItem.itemId.includes('can') ||
            activeHandItem.itemId.includes('cup'))
        ) {
          triggerPlayerActionAnim(p, 'throw_trash', 0.65);
          if (activeHand === 'left') p.leftHandItem = null;
          else p.rightHandItem = null;
          addPlayerCash(p, 5);
          addPlayerNotification(p, 'Эко-фандомат: тара сдана на переработку (+5 ₽)', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
          return;
        }
        setIsInventoryOpen(true);
        addPlayerNotification(p, 'Выберите пустую тару в инвентаре для сдачи в эко-фандомат', 'info');
        sound.playUseItem();
        break;
      }

      case 'trash_throw': {
        const activeHand = p.activeHand || 'right';
        const activeHandItem = activeHand === 'left' ? p.leftHandItem : p.rightHandItem;
        if (
          activeHandItem &&
          (activeHandItem.category === 'trash' ||
            activeHandItem.itemId.includes('trash') ||
            activeHandItem.itemId.includes('wrapper') ||
            activeHandItem.itemId.includes('empty'))
        ) {
          triggerPlayerActionAnim(p, 'throw_trash', 0.65);
          if (activeHand === 'left') p.leftHandItem = null;
          else p.rightHandItem = null;
          addPlayerNotification(p, 'Мусор утилизирован в урну', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
          return;
        }
        setIsInventoryOpen(true);
        addPlayerNotification(p, 'Откройте инвентарь и выбросьте ненужный мусор в урну', 'info');
        sound.playUseItem();
        break;
      }

      case 'trailer_hitch': {
        const { trailer, towingVeh } = target.data;
        if (trailer && towingVeh) {
          const success = hitchTrailerToVehicle(towingVeh, trailer, world);
          if (success) {
            triggerPlayerActionAnim(p, 'mechanic_work', 1.1);
            addPlayerNotification(p, `Прицеп успешно сцеплен с ${CAR_CONFIGS[towingVeh.type]?.name || towingVeh.type}!`, 'info');
            trailer.trailerPlugConnected = false;
            trailer.trailerBrakesConnected = false;
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
          }
        }
        break;
      }

      case 'trailer_unhitch': {
        const { trailer, towingVeh } = target.data;
        if (trailer && towingVeh) {
          const success = unhitchTrailerFromVehicle(towingVeh, world);
          if (success) {
            triggerPlayerActionAnim(p, 'mechanic_work', 1.0);
            trailer.trailerPlugConnected = false;
            trailer.trailerBrakesConnected = false;
            addPlayerNotification(p, `Прицеп отцеплен от ${CAR_CONFIGS[towingVeh.type]?.name || towingVeh.type}.`, 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
          }
        }
        break;
      }

      case 'trailer_connect_plug': {
        const { trailer } = target.data;
        if (trailer) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.85);
          trailer.trailerPlugConnected = true;
          addPlayerNotification(p, 'Электрическая вилка светотехники подключена!', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'trailer_disconnect_plug': {
        const { trailer } = target.data;
        if (trailer) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.8);
          trailer.trailerPlugConnected = false;
          addPlayerNotification(p, 'Кабель светотехники отключен.', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'trailer_connect_brakes': {
        const { trailer } = target.data;
        if (trailer) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.85);
          trailer.trailerBrakesConnected = true;
          addPlayerNotification(p, 'Тормозной пневмошланг подключен к тягачу!', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'trailer_disconnect_brakes': {
        const { trailer } = target.data;
        if (trailer) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.8);
          trailer.trailerBrakesConnected = false;
          addPlayerNotification(p, 'Тормозной пневмошланг отключен от тягача.', 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'trailer_toggle_handbrake': {
        const trailer = target.data;
        if (trailer) {
          triggerPlayerActionAnim(p, 'mechanic_work', 0.9);
          const currentlyEngaged = trailer.trailerParkingBrakeEngaged !== false;
          trailer.trailerParkingBrakeEngaged = !currentlyEngaged;
          if (trailer.trailerParkingBrakeEngaged) {
            addPlayerNotification(p, 'Стояночный тормоз прицепа затянут! Колеса заблокированы.', 'warning');
          } else {
            addPlayerNotification(p, 'Стояночный тормоз прицепа полностью отпущен!', 'info');
          }
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'real_estate_agency': {
        setIsRealEstateModalOpen(true);
        sound.playUseItem();
        break;
      }

      case 'apartment_door_locked_nokey': {
        const { apt } = target.data || {};
        const detailStr = apt ? ` (${apt.address})` : '';
        addPlayerNotification(p, `Дверь заперта на замок! Войти невозможно без ключа собственника${detailStr}. Обратитесь в Агентство Недвижимости.`, 'warning');
        sound.playUseItem();
        break;
      }

      case 'apartment_door_lock': {
        const { apt, hasKey } = target.data || {};
        if (!apt) break;
        if (!hasKey) {
          addPlayerNotification(p, `Дверь заперта! Требуется стальной ключ от квартиры (${apt.address})`, 'warning');
          sound.playUseItem();
          return;
        }
        triggerPlayerActionAnim(p, 'key_fob', 0.75);
        const res = toggleApartmentLock(p, apt);
        sound.playUseItem();
        addPlayerNotification(p, res.message, res.success ? 'heal' : 'warning');
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'gate_open_close': {
        const { prop, apt } = target.data || {};
        if (prop) {
          if (prop.isLocked) {
            addPlayerNotification(p, 'Заперто на ключ! Сначала отоприте замок.', 'warning');
            sound.playUseItem();
            return;
          }
          triggerPlayerActionAnim(p, 'key_fob', 0.75);
          prop.isOpen = !prop.isOpen;
          const isGate = prop.type === 'cottage_gate';
          const isWicket = prop.type === 'wicket_gate';
          const isBarrier = prop.type === 'security_barrier';
          const name = isGate ? 'Въездные ворота' : (isWicket ? 'Калитка' : (isBarrier ? 'Шлагбаум' : 'Ворота'));
          addPlayerNotification(p, prop.isOpen ? `${name} распахнуты!` : `${name} закрыты.`, 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'gate_lock_unlock': {
        const { prop, apt, hasKey } = target.data || {};
        if (prop) {
          if (!hasKey) {
            const detailStr = apt ? ` (${apt.address})` : '';
            addPlayerNotification(p, `Заперто! Требуется ключ от участка${detailStr}`, 'warning');
            sound.playUseItem();
            return;
          }
          triggerPlayerActionAnim(p, 'key_fob', 0.75);
          prop.isLocked = !prop.isLocked;
          if (prop.isLocked) {
            prop.isOpen = false; // Locking ensures it's closed
          }
          const isGate = prop.type === 'cottage_gate';
          const isWicket = prop.type === 'wicket_gate';
          const name = isGate ? 'Ворота' : (isWicket ? 'Калитка' : 'Ограждение');
          addPlayerNotification(p, prop.isLocked ? `${name} заперты на ключ.` : `${name} отперты!`, prop.isLocked ? 'heal' : 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'gate_locked_nokey': {
        const { prop, apt } = target.data || {};
        const detailStr = apt ? ` (${apt.address})` : '';
        addPlayerNotification(p, `Замок заперт! Требуется ключ от участка${detailStr}`, 'warning');
        sound.playUseItem();
        break;
      }



      case 'furniture_storage': {
        const { bld, currentFloor, furnitureIndex, furnitureType, subSlot, hasBuiltInSink, aptId, customTitle } = target.data || {};
        if (bld && furnitureType) {
          setFurnitureStorageData({
            buildingId: bld.id,
            floor: currentFloor ?? 0,
            furnitureIndex: furnitureIndex ?? 0,
            furnitureType,
            subSlot,
            hasBuiltInSink,
            aptId,
            customTitle
          });
          setIsFurnitureStorageOpen(true);
          sound.playUseItem();
        }
        break;
      }

      case 'bed_sleep': {
        const { furn, aptId, bld, furnitureType } = target.data || {};
        const bedType = furnitureType || (furn ? furn.type : 'bed');
        const bedX = target.worldX ?? (furn ? (bld ? bld.x + furn.x : furn.x) : p.x);
        const bedY = target.worldY ?? (furn ? (bld ? bld.y + furn.y : furn.y) : p.y);
        const bldId = bld ? bld.id : (p.insideBuildingId || '');
        const nextState = startLyingOnBed(p, bedType, bldId, bedX, bedY, timeHourRef.current, aptId);
        setBedSleepState(nextState);
        bedSleepStateRef.current = nextState;
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'furniture_pickup': {
        const { aptId, furnitureIndex } = target.data || {};
        if (aptId) {
          const apt = getApartmentById(aptId);
          if (apt && apt.isOwned) {
            const staticCount = apt.layout?.furniture?.length || 0;
            const dynamicIndex = furnitureIndex - staticCount;
            let removedType = '';
            let isDeveloper = false;

            if (dynamicIndex >= 0 && apt.dynamicFurniture && dynamicIndex < apt.dynamicFurniture.length) {
              const removed = apt.dynamicFurniture.splice(dynamicIndex, 1)[0];
              removedType = removed.type;
            } else if (furnitureIndex >= 0 && furnitureIndex < staticCount && apt.layout?.furniture) {
              const removed = apt.layout.furniture.splice(furnitureIndex, 1)[0];
              removedType = removed.type;
              isDeveloper = true;
            }

            if (removedType) {
              clearInteriorCanvasCache();

              // Evacuate any stored items from furniture storage container (and built-in sink sub-container if any)
              const baseBldId = target.data?.bld?.id || apt.buildingId;
              const baseFloor = target.data?.currentFloor ?? apt.floor ?? 0;
              for (const sId of [
                buildFurnitureStorageId(baseBldId, baseFloor, furnitureIndex, apt.id),
                buildFurnitureStorageId(baseBldId, baseFloor, furnitureIndex, apt.id, 'sink'),
              ]) {
                const stEvac = getExistingFurnitureStorage(sId);
                if (stEvac && stEvac.items && stEvac.items.length > 0) {
                  for (const storedItem of stEvac.items) {
                    if (storedItem) {
                      const added = addItemToPlayer(p, storedItem);
                      if (!added) {
                        if (!world.groundItems) world.groundItems = [];
                        world.groundItems.push({
                          id: `ground_storage_drop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          x: p.x,
                          y: p.y,
                          item: storedItem,
                          spawnTime: Date.now()
                        });
                      }
                    }
                  }
                  stEvac.items = [];
                }
                deleteFurnitureStorage(sId);
              }

              const itemMap: Record<string, string> = {
                chair: 'furn_chair',
                table: 'furn_table',
                sofa: 'furn_sofa',
                bed: 'furn_bed',
                fridge: 'furn_fridge',
                tv: 'furn_tv',
                shelf: 'furn_shelf',
                plant: 'furn_plant',
                wardrobe: 'furn_wardrobe',
                nightstand: 'furn_nightstand',
                kitchen_counter: 'furn_kitchen_counter',
                tv_cabinet: 'furn_tv_cabinet',
                carpet: 'furn_carpet',
                bath: 'furn_bath',
                sink: 'furn_sink',
                toilet: 'furn_toilet',
                desk: 'furn_desk',
                file_cabinet: 'furn_shelf',
                bookshelf: 'furn_bookshelf',
                mirror: 'furn_mirror'
              };
              const itemId = itemMap[removedType] || (ITEM_CATALOG[`furn_${removedType}`] ? `furn_${removedType}` : 'furn_chair');
              const furnItem = createItem(itemId, 1);
              
              const added = addItemToPlayer(p, furnItem);
              if (!added) {
                if (!world.groundItems) world.groundItems = [];
                world.groundItems.push({
                  id: `ground_furn_${Date.now()}`,
                  x: p.x,
                  y: p.y,
                  item: furnItem,
                  spawnTime: Date.now()
                });
              }
              sound.playUseItem();
              addPlayerNotification(
                p, 
                isDeveloper 
                  ? `Мебель застройщика (${furnItem.nameRu}) демонтирована и убрана в инвентарь!` 
                  : `Мебель (${furnItem.nameRu}) забрана в руки/инвентарь`, 
                'info'
              );
              setVitalsRefreshTick(t => t + 1);
            } else {
              addPlayerNotification(p, 'Не удалось забрать данный предмет мебели.', 'warning');
            }
          }
        }
        break;
      }

      case 'furniture_rotate': {
        const { aptId, furnitureIndex } = target.data || {};
        if (aptId) {
          const apt = getApartmentById(aptId);
          if (apt && apt.isOwned) {
            const staticCount = apt.layout?.furniture?.length || 0;
            const dynamicIndex = furnitureIndex - staticCount;
            if (dynamicIndex >= 0 && apt.dynamicFurniture && dynamicIndex < apt.dynamicFurniture.length) {
              const df = apt.dynamicFurniture[dynamicIndex];
              df.rotation = ((df.rotation || 0) + Math.PI / 4) % (Math.PI * 2);
              clearInteriorCanvasCache();
              sound.playUseItem();
              addPlayerNotification(p, 'Мебель повернута на 45°', 'info');
              setVitalsRefreshTick(t => t + 1);
            } else if (furnitureIndex >= 0 && furnitureIndex < staticCount && apt.layout?.furniture) {
              const sf = apt.layout.furniture[furnitureIndex];
              sf.angle = ((sf.angle || 0) + Math.PI / 4) % (Math.PI * 2);
              clearInteriorCanvasCache();
              sound.playUseItem();
              addPlayerNotification(p, 'Мебель застройщика повернута на 45°', 'info');
              setVitalsRefreshTick(t => t + 1);
            }
          }
        }
        break;
      }

      case 'hand_item': {
        executeActiveHandItem();
        break;
      }
    }
  };

  // --- ACTIVE HAND ITEM ACTIVATION (RMB on PC / Long-Tap on mobile when not pointing at a world target) ---
  const executeActiveHandItem = () => {
    const p = playerRef.current;
    const world = worldRef.current;
    if (!p || !world) return;

    const activeHand = p.activeHand || 'right';
    const handItem = activeHand === 'left' ? p.leftHandItem : p.rightHandItem;
    if (!handItem) return;

    if (handItem.itemId === 'wallet') {
      setInventoryOpenContainerHand(activeHand);
      setIsInventoryOpen(true);
      sound.playUseItem();
      addPlayerNotification(p, `Открыт контейнер: ${handItem.nameRu}`, 'info');
      return;
    }

    const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
    const handMedId = handItem.fluidStorage?.attributes?.medicalEffectId || handItem.originalCatalogId || handItem.itemId;
    if ((handItem.category === 'med' && (TOPICAL_ITEMS.includes(handMedId) || TOPICAL_ITEMS.includes(handItem.itemId))) || (handItem as any).requiresLimbSelection) {
      setTreatmentModalItem({ index: -1, item: handItem });
      sound.playUseItem();
      return;
    }

    if (handItem.usable || handItem.fluidStorage || handItem.isContainer) {
      useHandItemOnPlayer(p, activeHand, world || undefined);
      sound.resume();
      setVitalsRefreshTick(t => t + 1);
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
        const layout = getBuildingLayout(bld, floor);
        const relX = player.x - bld.x;
        const relY = player.y - bld.y;

        // Find elevator or stairs zone in the target floor matching player's current position
        const elevators = (layout.elevators && layout.elevators.length > 0) ? layout.elevators : (layout.elevatorZone ? [layout.elevatorZone] : []);
        const stairsList = (layout.stairs && layout.stairs.length > 0) ? layout.stairs : (layout.stairsZone ? [layout.stairsZone] : []);
        
        let targetZones = elevators.filter(e => e && e.x > 0);
        if (activeElevatorMenu?.type === 'stairs' || targetZones.length === 0) {
          const validStairs = stairsList.filter(s => s && s.x > 0);
          if (validStairs.length > 0) {
            targetZones = validStairs;
          }
        }
        
        let bestZone = targetZones[0] || layout.elevatorZone || layout.stairsZone;
        if (targetZones.length > 0) {
          let minDist = Infinity;
          for (const zone of targetZones) {
            if (!zone || zone.x <= 0) continue;
            const d = Math.hypot(relX - (zone.x + zone.width / 2), relY - (zone.y + zone.height / 2));
            if (d < minDist) {
              minDist = d;
              bestZone = zone;
            }
          }
        }

        const zoneX = (bestZone && bestZone.x > 0) ? bestZone.x : (layout.width / 2 - 10);
        const zoneY = (bestZone && bestZone.y > 0) ? bestZone.y : (layout.height / 2 - 10);
        const zoneW = bestZone?.width ?? 20;
        const zoneH = bestZone?.height ?? 20;
        const destX = bld.x + zoneX + zoneW / 2;
        const destY = bld.y + (zoneY < layout.height / 2 ? zoneY + zoneH + 14 : zoneY - 14);
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
        const keepPick = getPowertrainPickByIds(veh.engineState);
        veh.speed = 0;
        veh.vx = 0;
        veh.vy = 0;
        veh.steerAngle = 0;
        veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
        veh.engineState = createDefaultEngineState(veh.type);
        veh.fuelSystem = createDefaultFuelSystem(veh.type);
        if (keepPick) applyPowertrain(veh, keepPick);
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
      const keepPick = getPowertrainPickByIds(veh.engineState);
      veh.damage = createDefaultVehicleDamage(veh.length, veh.width);
      veh.engineState = createDefaultEngineState(veh.type);
      veh.fuelSystem = createDefaultFuelSystem(veh.type);
      if (keepPick) applyPowertrain(veh, keepPick);
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
      addPlayerNotification(player, 'Все травмы конечностей исцелены! Здоровье восстановлено.', 'heal');
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
        const keepPick = getPowertrainPickByIds(veh.engineState);
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
        if (keepPick) applyPowertrain(veh, keepPick);
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

  const toggleSoundMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div id="game-container"className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* Primary Canvas */}
      <canvas
        id="main-canvas"ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"/>
      {/* GPU shader layer over the 2D canvas; clicks pass through to the canvas below */}
      <canvas
        id="gpu-canvas" ref={gpuCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ display: 'none' }}/>

      {/* TOP-LEFT: PAUSE BUTTON + GAME MENU + SIMULATION SPEED (BeamNG style) */}
      <div id="hud-top-left" className="absolute z-50 flex flex-col items-start gap-2 pointer-events-none select-none" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', left: 'calc(env(safe-area-inset-left, 0px) + 12px)' }}>
        <div className="flex items-center gap-2">
          <button
            id="hud-pause-btn"
            type="button"
            className="hud-btn hud-sq"
            onClick={openPauseMenu}
            title="Пауза [Esc]"
            aria-label="Пауза">
            <Pause className="w-5 h-5" />
          </button>
          <button
            id="quick-settings-toggle-btn"
            type="button"
            className={`hud-btn ${isRadialMenuOpen ? 'on' : ''}`}
            onClick={() => setIsRadialMenuOpen((prev) => !prev)}
            title="Центральное меню: окружение, авто, спавн, починка, трафик"
            aria-expanded={isRadialMenuOpen}>
            <MenuIcon className="w-5 h-5" />
            <span>Меню</span>
          </button>
          <TimeScaleButton value={timeScale} onToggle={toggleSlowMotion} />
        </div>
      </div>

      {/* Slow-motion cue: small readout + soft vignette */}
      {timeScale < 1.0 && !isMainMenuOpen && !isPauseMenuOpen && <SlowMotionIndicator value={timeScale} />}

      {/* TOP-RIGHT: MINI-MAP (BeamNG menu style) */}
      <div id="hud-top-right" className="absolute z-40 flex flex-col items-end pointer-events-none select-none" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)', right: 'calc(env(safe-area-inset-right, 0px) + 12px)' }}>
        <Minimap
          worldRef={worldRef}
          playerRef={playerRef}
          cameraRef={cameraRef}
          streetName={streetName}
          paused={isFullMapOpen}
          onOpenMap={() => setIsFullMapOpen(true)}
          onCameraZoomIn={() => { userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15); }}
          onCameraZoomOut={() => { userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15); }}
          frameTimeRef={minimapFrameMsRef}
        />
      </div>

      {/* BOTTOM-CENTER DETAILED VEHICLE INSTRUMENT CLUSTER (phones: cab levers take this spot) */}
      {isInVehicle && (() => {
        const playerCar = worldRef.current && playerRef.current
          ? worldRef.current.vehicles.find((v) => v.id === playerRef.current.currentVehicleId) || null
          : null;
        if (isMobileTouch && (playerRef.current?.craneOperatorActive || (playerCar && isExcavatorVehicle(playerCar) && playerCar.exOperatorMode))) {
          return null;
        }
        return (
          <SpeedometerHUD
            vehicle={playerCar}
            speedKmh={speedKmh}
            hudTick={hudTick}
            gear={gear}
            isDrifting={isDrifting}
            isHandbraking={inputRef.current.handbrake}
            playerTurnSignal={playerTurnSignal}
            playerHeadlightMode={playerHeadlightMode}
            timeHour={timeHour}
            calendar={calendar}
            weather={weather}
            onToggleTurnSignal={toggleTurnSignal}
            onToggleHeadlights={toggleHeadlights}
            onToggleEngine={handleToggleEngine}
            onOpenRadialMenu={() => setIsVehicleBoardOpen(true)}
            onSelectGear={handleSelectGear}
            onTakeOutKey={() => {
              const world = worldRef.current;
              const player = playerRef.current;
              if (world && player && player.isInVehicle && player.currentVehicleId) {
                const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
                if (veh) {
                  takeOutKeyFromVehicle(player, veh);
                  setVitalsRefreshTick((t) => t + 1);
                }
              }
            }}
            hasKeysInInventory={(() => {
              const player = playerRef.current;
              if (!player) return [];
              const keys: ('gold'| 'iron')[] = [];
              const hasGold = (player.inventory || []).some(i => i && i.itemId === 'car_key_gold') || player.leftHandItem?.itemId === 'car_key_gold'|| player.rightHandItem?.itemId === 'car_key_gold';
              const hasIron = (player.inventory || []).some(i => i && i.itemId === 'car_key_iron') || player.leftHandItem?.itemId === 'car_key_iron'|| player.rightHandItem?.itemId === 'car_key_iron';
              if (hasGold) keys.push('gold');
              if (hasIron) keys.push('iron');
              return keys;
            })()}
            onInsertKey={(keyType) => {
              const world = worldRef.current;
              const player = playerRef.current;
              if (world && player && player.isInVehicle && player.currentVehicleId) {
                const veh = world.vehicles.find((v) => v.id === player.currentVehicleId);
                if (veh) {
                  insertKeyToVehicle(player, veh, keyType);
                  setVitalsRefreshTick((t) => t + 1);
                }
              }
            }}
            onToggleDiffLock={() => {
              inputRef.current.diffLockToggle = true;
            }}
            onToggleAxleDiffLock={handleToggleAxleDiffLock}
            isMobileTouch={isMobileTouch}
          />
        );
      })()}

      {/* KS-3577 BOOM CRANE & VACUUM CISTERN OPERATOR HUD (DESKTOP + MOBILE) */}
      <TruckSuperstructureHUD
        player={playerRef.current}
        world={worldRef.current}
        inputRef={inputRef}
        isMobileTouch={isMobileTouch}
        onForceUpdate={() => setVitalsRefreshTick((t) => t + 1)}
        onOpenOutriggersModal={() => {
          const world = worldRef.current;
          const player = playerRef.current;
          const veh = world && player
            ? (world.vehicles.find((v) => v.id === player.currentVehicleId) ||
               world.vehicles.find((v) => isVehicleCraneTruck(v) && Math.hypot(v.x - player.x, v.y - player.y) < 150))
            : null;
          if (veh) {
            setCraneOutriggersVehicle(veh);
            setIsCraneOutriggersModalOpen(true);
            sound.playUseItem();
          }
        }}
        onEnterCraneCab={() => {
          const world = worldRef.current;
          const player = playerRef.current;
          if (!world || !player) return;
          const veh = world.vehicles.find((v) => v.id === player.currentVehicleId) ||
            world.vehicles.find((v) => isVehicleCraneTruck(v) && Math.hypot(v.x - player.x, v.y - player.y) < 150);
          if (veh) {
            player.isInVehicle = true;
            player.currentVehicleId = veh.id;
            player.craneOperatorActive = true;
            veh.craneOperatorActive = true;
            veh.craneControlMode = true;
            veh.isPlayerControlled = true;
            setIsInVehicle(true);
            sound.playCarDoor();
            addPlayerNotification(player, 'Вы заняли рабочее место крановщика КС-3577 (кабина на поворотной платформе)', 'info');
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
        onExitCraneCab={() => {
          handleEnterExitVehicle();
        }}
      />

      {/* TVEX EK-12 WHEELED EXCAVATOR OPERATOR CONSOLE (DESKTOP + MOBILE) */}
      <ExcavatorHUD
        player={playerRef.current}
        world={worldRef.current}
        inputRef={inputRef}
        isMobileTouch={isMobileTouch}
        onForceUpdate={() => setVitalsRefreshTick((t) => t + 1)}
      />

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
            hideDriveControls={Boolean(
              isInVehicle &&
              (playerRef.current?.craneOperatorActive ||
                playerCar?.craneOperatorActive ||
                (playerCar && isExcavatorVehicle(playerCar) && playerCar.exOperatorMode))
            )}
            isInVehicle={isInVehicle}
            hasHeldWaterHose={Boolean(playerRef.current?.heldWaterHose)}
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
            onOpenRadialMenu={() => setIsVehicleBoardOpen(true)}
            activeCarName={activeCarName}
            speedKmh={speedKmh}
            activeTurnSignal={playerTurnSignal}
            onToggleTurnSignal={toggleTurnSignal}
            gear={gear}
            transmissionType={eng?.transmissionType || 'AUTO'}
            transmissionKind={eng?.transmissionKind}
            gearCount={eng?.gearRatios ? Math.max(1, eng.gearRatios.length - 2) : undefined}
            onSelectGear={handleSelectGear}
            onToggleEngine={handleToggleEngine}
            isEngineRunning={eng ? !!eng.engineRunning : true}
            hasTransferCase={eng?.hasTransferCase}
            transferCaseMode={eng?.transferCaseMode}
            carType={playerCar?.type}
            tractorRange={eng?.tractorRange}
            headlightMode={playerHeadlightMode}
            onToggleHeadlights={toggleHeadlights}
            isFrontFogOn={!!playerCar?.frontFogLightsOn}
            onToggleFrontFog={handleToggleFrontFogLights}
            isRearFogOn={!!playerCar?.rearFogLightsOn}
            onToggleRearFog={handleToggleRearFogLights}
            hasRoadTrainLights={hasRoadTrainLights(playerCar)}
            isRoadTrainLightsOn={playerCar?.roadTrainLightsOn !== false}
            onToggleRoadTrainLights={handleToggleRoadTrainLights}
            tractorBrakeLatch={playerCar?.tractorBrakeLatch !== false}
            uiScale={touchUiScale}
            onCycleUiScale={handleCycleTouchScale}
            onToggleTransferCase={() => {
              inputRef.current.transferCaseToggle = true;
            }}
          />
        );
      })()}

      {/* FLOATING GPS NAVIGATION HUD BANNER */}
      {gpsDestination && (
        <div id="gps-hud-banner"className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="bg-slate-900/95 backdrop-blur-md border border-sky-400/60 rounded-2xl px-4 py-2 shadow-2xl flex items-center gap-3 text-white text-xs">
            <div className="bg-sky-500/20 p-2 rounded-xl border border-sky-400/40 text-sky-300 animate-pulse flex items-center justify-center">
              <Navigation className="w-4 h-4"/>
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
              id="btn-cancel-gps"onClick={() => handleSetGpsTarget(null)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1.5"title="Отменить маршрут">
              <X className="w-4 h-4"/>
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN INTERACTIVE MAP MODAL (M key) */}
      <React.Suspense fallback={null}>
        {isFullMapOpen && (
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
        )}

        {/* Traffic Diagnostics & AI Console */}
        {isConsoleOpen && (
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
        )}

        {/* Dynamic Performance Profiler Console */}
        {isPerfConsoleOpen && (
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
        )}
      </React.Suspense>

      {/* SPAWN LOCATION SELECTION MODAL */}
      {isSpawnMenuOpen && (
        <div 
          id="spawn-modal-overlay"className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"onClick={() => setIsSpawnMenuOpen(false)}
        >
          <div 
            id="spawn-modal-content"className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <MapPin className="w-5 h-5"/>
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Точка спавна и быстрый переезд</h2>
                  <p className="text-slate-400 text-xs">Выберите район города для мгновенного перемещения игрока и машины</p>
                </div>
              </div>
              <button
                id="btn-close-spawn-modal"onClick={() => setIsSpawnMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
                <X className="w-5 h-5"/>
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
                        ? 'bg-emerald-950/50 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/50': 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600 text-slate-200'}`}
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
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all">
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ELEVATOR / STAIRS FLOOR SELECTION MENU */}
      {activeElevatorMenu && (
        <div 
          id="elevator-modal"className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-sky-500/50 rounded-2xl p-4 shadow-2xl text-white min-w-[280px] max-w-[320px] pointer-events-auto">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
            <div className="p-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 font-mono text-xs font-bold">
              {activeElevatorMenu.type === 'elevator'? '[ЛИФТ]': '[ЛЕСТН]'}
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-100">
                {activeElevatorMenu.type === 'elevator'? 'Лифт здания': 'Лестничный марш'}
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
                      ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/20': 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'}`}
                >
                  {fIdx === 0 ? '1': fIdx + 1}
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
        id="fade-transition-overlay"className={`fixed inset-0 bg-slate-950 transition-opacity duration-200 z-[9999] pointer-events-none ${
          fadeActive ? 'opacity-100': 'opacity-0'}`}
      />

      {/* SURVIVAL VITALS HUD & QUICK HOTBAR */}
      <PlayerNeedsHUD
        player={playerRef.current}
        world={worldRef.current}
        isMobileTouch={isMobileTouch}
        onOpenInventory={() => setIsInventoryOpen(true)}
        onOpenSelfInspection={() => setIsInspectionOpen(true)}
        onToggleActiveHand={() => {
          const p = playerRef.current;
          if (p) {
            p.activeHand = p.activeHand === 'left'? 'right': 'left';
            sound.playUseItem();
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
        onSelectActiveHand={(hand) => {
          const p = playerRef.current;
          if (p) {
            p.activeHand = hand;
            sound.playUseItem();
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
        onUseActiveHandItem={() => {
          executeActiveHandItem();
        }}
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
            const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
            const hotbarMedId = item.fluidStorage?.attributes?.medicalEffectId || item.originalCatalogId || item.itemId;
            if (item && item.category === 'med'&& (TOPICAL_ITEMS.includes(hotbarMedId) || TOPICAL_ITEMS.includes(item.itemId))) {
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

      {/* TARGETED LIMB TREATMENT, INSPECTION, INVENTORY, PHONE, DEALERSHIP & SHOP MODALS */}
      <React.Suspense fallback={null}>
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
              if (idx < 0) {
                const activeHand = p.activeHand || 'right';
                useHandItemOnPlayer(p, activeHand, worldRef.current || undefined, injuryId);
              } else {
                useItemOnPlayer(p, idx, worldRef.current || undefined, injuryId);
              }
              sound.resume();
              setVitalsRefreshTick((t) => t + 1);
            }
          }}
        />
      )}

      {/* SELF INSPECTION & BODY SENSATIONS MODAL */}
      {isInspectionOpen && (
        <SelfInspectionModal
          isOpen={isInspectionOpen}
          onClose={() => setIsInspectionOpen(false)}
          player={playerRef.current}
        />
      )}

      {/* FULL INVENTORY & SURROUNDINGS MANAGEMENT MODAL */}
      {isInventoryOpen && (
        <InventoryModal
          isOpen={isInventoryOpen}
          onClose={() => {
            setIsInventoryOpen(false);
            setInventoryOpenContainerHand(null);
          }}
          player={playerRef.current}
          world={worldRef.current}
          initialOpenContainerHand={inventoryOpenContainerHand}
          onInspectDocument={(item) => {
            setSelectedPropertyDocItem(item);
            setIsPropertyDocumentModalOpen(true);
          }}
          onRequestLimbTreatment={(idx, item) => {
            setTreatmentModalItem({ index: idx, item });
          }}
          onSleepInBed={() => {
            const p = playerRef.current;
            if (p && p.needs) {
              p.needs.isSleeping = true;
              p.needs.sleepiness = 0;
              p.needs.energy = 100;
              p.needs.health = Math.min(100, p.needs.health + 20);
              addPlayerNotification(p, 'Вы отдохнули и восстановили силы', 'sleep');
            }
          }}
        />
      )}

      {/* INTERACTIVE SMARTPHONE MODAL */}
      {activePhoneItem && (
        <PhoneModal
          item={activePhoneItem}
          player={playerRef.current}
          world={worldRef.current}
          onSetGpsTarget={handleSetGpsTarget}
          onClose={() => setActivePhoneItem(null)}
        />
      )}

      {/* CAR DEALERSHIP MODAL */}
      {isDealershipOpen && (
        <CarDealershipModal
          isOpen={isDealershipOpen}
          onClose={() => setIsDealershipOpen(false)}
          player={playerRef.current}
          world={worldRef.current}
          dealershipX={252}
          dealershipY={5916}
        />
      )}

      {/* SHOP & AUTO REPAIR MODAL */}
      {isShopOpen && (
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        shopBuildingId={shopBuildingId}
        shopRoomName={shopRoomName}
        shopTitle={shopTitle}
        shopType={shopType}
        gasPumps={worldRef.current?.gasPumps || []}
        vehicles={worldRef.current?.vehicles || []}
        canRepairVehicle={canRepairVehicle || playerRef.current?.isInVehicle}
        onBuyItems={(items, totalCost) => {
          const p = playerRef.current;
          const w = worldRef.current;
          if (!p || !w) return;
          const currentCash = getPlayerCash(p);
          if (currentCash >= totalCost) {
            const success = deductPlayerCash(p, totalCost);
            if (success) {
              if (!w.groundItems) w.groundItems = [];

              let regularItemsCount = 0;
              const nonFuelEntries: MapShopCatalogEntry[] = [];

              items.forEach((item) => {
                if (item.fuelPumpId || item.itemId === 'fuel_order') {
                  const pump = w.gasPumps?.find((gp) => gp.id === item.fuelPumpId) || w.gasPumps?.[0];
                  if (pump) {
                    const car = pump.connectedVehicleId ? w.vehicles.find((v) => v.id === pump.connectedVehicleId) : null;
                    startGasPumpFueling(pump, item.fuelLiters || 30, item.fuelType || 'ai95', car);
                    const grade = FUEL_GRADES[item.fuelType || 'ai95'];
                    addPlayerNotification(
                      p,
                      `Заправка [${grade?.nameRu || ''}] (${item.fuelLiters || 30} л) на ТРК №${pump.pumpNumber} успешно оплачена! Подача топлива включена.`,
                      'pickup');
                  }
                } else {
                  regularItemsCount++;
                  nonFuelEntries.push(item);
                }
              });

              const packed = packagePurchasedShopItems(nonFuelEntries);
              packed.outputItems.forEach((boughtItem, idx) => {
                const angle = (p.angle || 0) + (Math.random() * 0.9 - 0.45);
                const dist = 28 + (idx * 14) % 40;
                w.groundItems.push({
                  id: `ground_bought_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
                  x: p.x + Math.cos(angle) * dist,
                  y: p.y + Math.sin(angle) * dist,
                  item: boughtItem,
                  spawnTime: Date.now()
                });
              });

              sound.playUseItem();
              if (regularItemsCount > 0) {
                if (packed.carrierBagsCount > 0 && packed.packedIntoCarrierCount > 0) {
                  addPlayerNotification(
                    p,
                    `Куплено: ${regularItemsCount} поз. (-${totalCost} ₽). Товар уложен в пакеты (${packed.carrierBagsCount} шт.) на прилавке.`,
                    'pickup'
                  );
                } else if (packed.produceBagsCount > 0) {
                  addPlayerNotification(
                    p,
                    `Куплено: ${regularItemsCount} поз. (-${totalCost} ₽). Штучные продукты расфасованы по мешочкам (${packed.produceBagsCount} шт.).`,
                    'pickup'
                  );
                } else {
                  addPlayerNotification(p, `Куплено: ${regularItemsCount} поз. (-${totalCost} ₽). Товары выложены на прилавок.`, 'pickup');
                }
              }
              setVitalsRefreshTick((t) => t + 1);
            }
          } else {
            addPlayerNotification(p, 'Недостаточно денег на балансе!', 'warning');
          }
        }}
        onRepairVehicle={(alreadyPaid, customCost) => {
          const p = playerRef.current;
          const w = worldRef.current;
          if (!p || !w) return;
          const finalCost = typeof customCost === 'number' ? customCost : 300;
          if (!alreadyPaid) {
            const currentCash = getPlayerCash(p);
            if (currentCash < finalCost) {
              addPlayerNotification(p, `Недостаточно денег для ремонта (${finalCost.toLocaleString()} ₽)`, 'warning');
              return;
            }
          }

          // Find PIT-STOP repair bays / platforms
          const pitstopBuildings = w.buildings.filter(
            (bld) => bld.shopBrand === 'pitstop_service'|| bld.type === 'car_dealership');

          let targetCar: Vehicle | null = null;

          for (const bld of pitstopBuildings) {
            const bayX = bld.x + bld.width / 2;
            const bayY = bld.y + bld.height + 25;
            // Check if any vehicle is parked on this repair platform (within 40 units)
            const parkedCar = w.vehicles.find((v) => Math.hypot(v.x - bayX, v.y - bayY) < 40);
            if (parkedCar) {
              targetCar = parkedCar;
              break;
            }
          }

          // Fallback if player is sitting in a vehicle parked near any PIT-STOP
          if (!targetCar && p.isInVehicle && p.currentVehicleId) {
            const currentCar = w.vehicles.find((v) => v.id === p.currentVehicleId);
            if (currentCar) {
              const nearService = pitstopBuildings.some((bld) => 
                Math.hypot(currentCar.x - (bld.x + bld.width / 2), currentCar.y - (bld.y + bld.height / 2)) < 120
              );
              if (nearService) {
                targetCar = currentCar;
              }
            }
          }

          if (targetCar) {
            if (!alreadyPaid) {
              deductPlayerCash(p, finalCost);
            }
            // 1. Reset physical body damage
            targetCar.damage = createDefaultVehicleDamage(targetCar.length, targetCar.width);
            
            // 2. Fully repair engine state to defaults (fix infinite repair cost bug)
            if (targetCar.engineState) {
              targetCar.engineState.radiatorPunctured = false;
              targetCar.engineState.oilPunctured = false;
              targetCar.engineState.engineHealth = 100;
              targetCar.engineState.transmissionHealth = 100;
              targetCar.engineState.isSeized = false;
              targetCar.engineState.transmissionJammed = false;
              targetCar.engineState.engineKnocking = false;
              targetCar.engineState.engineStalled = false;
              targetCar.engineState.overheatingSteam = false;
              targetCar.engineState.radiatorWater = 100;
              targetCar.engineState.oilLevel = 100;
              if (targetCar.engineState.batteryCharge < 20) {
                targetCar.engineState.batteryCharge = 100;
              }
              targetCar.engineState.batteryPosConnected = true;
              targetCar.engineState.batteryNegConnected = true;
              targetCar.engineState.starterWorking = true;
              targetCar.engineState.alternatorWorking = true;
              targetCar.engineState.coolingFanBroken = false;
              targetCar.engineState.turboHealth = 100;
              targetCar.engineState.intercoolerHealth = 100;
              targetCar.engineState.airIntakeDamaged = false;
              targetCar.engineState.ecuDamaged = false;
              targetCar.engineState.fuelInjectorPumpDamaged = false;
              targetCar.engineState.gboReducerDamaged = false;
            }
            
            // 3. Fully repair fuel system (leaks and pressure rail)
            if (targetCar.fuelSystem) {
              targetCar.fuelSystem.tankPunctured = false;
              targetCar.fuelSystem.fuelRailBroken = false;
            }

            sound.playUseItem();
            const costText = alreadyPaid ? '': `(-${finalCost.toLocaleString()} ₽)`;
            addPlayerNotification(p, `Автомобиль успешно отремонтирован на подъемнике PIT-STOP! ${costText}`, 'heal');
            setVitalsRefreshTick((t) => t + 1);
            handleCreateSave('Автосохранение');
          } else {
            addPlayerNotification(p, 'Загоните автомобиль на специальную ремонтную площадку (подъёмник) автосервиса PIT-STOP!', 'warning');
          }
        }}
        onTuningVehicle={(action, metadata) => {
          const p = playerRef.current;
          const w = worldRef.current;
          if (!p || !w) return;

          // Find PIT-STOP repair bays / platforms
          const pitstopBuildings = w.buildings.filter(
            (bld) => bld.shopBrand === 'pitstop_service'|| bld.type === 'car_dealership');

          let targetCar: Vehicle | null = null;

          for (const bld of pitstopBuildings) {
            const bayX = bld.x + bld.width / 2;
            const bayY = bld.y + bld.height + 25;
            const parkedCar = w.vehicles.find((v) => Math.hypot(v.x - bayX, v.y - bayY) < 60);
            if (parkedCar) {
              targetCar = parkedCar;
              break;
            }
          }

          if (!targetCar && p.isInVehicle && p.currentVehicleId) {
            const currentCar = w.vehicles.find((v) => v.id === p.currentVehicleId);
            if (currentCar) {
              const nearService = pitstopBuildings.some((bld) => 
                Math.hypot(currentCar.x - (bld.x + bld.width / 2), currentCar.y - (bld.y + bld.height / 2)) < 120
              );
              if (nearService) {
                targetCar = currentCar;
              }
            }
          }

          // Fallback to closest car within 120 units
          if (!targetCar) {
            targetCar = w.vehicles
              .filter((v) => Math.hypot(v.x - p.x, v.y - p.y) < 120)
              .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] || null;
          }

          if (targetCar) {
            if (action === 'gbo_install') {
              targetCar.hasGBO = true;
              addPlayerNotification(p, 'ГБО Lovato 4 успешно установлено на ваш автомобиль!', 'pickup');
            } else if (action === 'gbo_remove') {
              targetCar.hasGBO = false;
              addPlayerNotification(p, 'ГБО успешно демонтировано!', 'warning');
            } else if (action === 'alignment') {
              if (targetCar.damage) {
                targetCar.damage.steeringDrift = 0;
              }
              addPlayerNotification(p, 'Сход-развал 3D успешно отрегулирован. Машину больше не уводит!', 'pickup');
            } else if (action === 'suspension') {
              (targetCar as any).hasHeavySuspension = true;
              addPlayerNotification(p, 'Усиленная подвеска Bilstein HD успешно установлена!', 'pickup');
            } else if (action === 'chiptuning') {
              (targetCar as any).hasChiptuning = true;
              addPlayerNotification(p, 'Чип-тюнинг ECU Stage 1 успешно применен к двигателю!', 'pickup');
            } else if (action === 'rearview_camera') {
              targetCar.hasRearviewCamera = true;
              addPlayerNotification(p, 'Камера заднего вида с динамической траекторией успешно установлена!', 'pickup');
            } else if (action === 'paint') {
              const target = metadata?.paintTarget || 'body';
              const color = metadata?.color || '#991b1b';
              if (target === 'roof') {
                targetCar.roofColor = color;
              } else {
                targetCar.color = color;
              }
              addPlayerNotification(p, 'Лакокрасочное покрытие кузова успешно обновлено!', 'pickup');
            }
            setVitalsRefreshTick((t) => t + 1);
            handleCreateSave('Автосохранение');
          } else {
            addPlayerNotification(p, 'Не удалось обнаружить автомобиль для тюнинга на площадке!', 'warning');
          }
        }}
      />
      )}
      </React.Suspense>

      {/* IN-CAR VEHICLE BOARD RADIAL (приборка) */}
      <VehicleBoardMenu
        isOpen={isVehicleBoardOpen}
        onClose={() => setIsVehicleBoardOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        onToggleWipers={handleToggleWipers}
        onToggleHeadlights={toggleHeadlights}
        onToggleFrontFogLights={handleToggleFrontFogLights}
        onToggleRearFogLights={handleToggleRearFogLights}
        onToggleSiren={handleToggleSiren}
        onToggleTurnSignal={toggleTurnSignal}
        onChangeHeaterMode={handleChangeHeaterMode}
        onToggleAC={handleToggleAC}
        onToggleRecirc={handleToggleRecirc}
        onToggleEngine={handleToggleEngine}
        onToggleWindow={handleToggleWindow}
        onToggleTrailerHitch={handleToggleTrailerHitch}
        onToggleRoadTrainLights={handleToggleRoadTrainLights}
        onCycleDiffLock={() => {
          inputRef.current.diffLockToggle = true;
        }}
      />

      {/* IN-game RADIAL QUICK MENU (board / vehicle config / environment / spawn / repair / traffic) */}
      <RadialMenu
        isOpen={isRadialMenuOpen}
        onClose={() => setIsRadialMenuOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        timeHour={timeHour}
        weather={weather}
        isTimeAutoCycling={isTimeAutoCycling}
        isTrafficEnabled={isAiTrafficOn}
        canEditTraffic={
          (activeWorldRef.current.origin !== 'server' &&
            onlineManager.status === 'disconnected' &&
            worldRef.current?.gameMode === 'freeroam') ||
          (activeWorldRef.current.origin === 'server' && onlineManager.isHost)
        }
        onSetTime={setTimeOfDay}
        onSetWeather={setWeatherType}
        onToggleTimeAuto={() => {
          setIsTimeAutoCycling((prev) => !prev);
          const pl = playerRef.current;
          if (pl) {
            addPlayerNotification(pl, !isTimeAutoCycling ? 'Ход времени: ВКЛ' : 'Ход времени: ПАУЗА', 'info');
          }
        }}
        onSetTrafficEnabled={handleSetAiTraffic}
        onUpdateTrafficCounts={handleUpdateTrafficCounts}
        onApplyVehicleConfig={handleApplyVehicleConfig}
        onRepairAllVehicles={handleResetAllVehiclesDamage}
        onOpenSpawnMenu={() => {
          setIsSpawnMenuOpen(true);
        }}
        onToggleWipers={handleToggleWipers}
        onToggleHeadlights={toggleHeadlights}
        onToggleFrontFogLights={handleToggleFrontFogLights}
        onToggleRearFogLights={handleToggleRearFogLights}
        onToggleSiren={handleToggleSiren}
        onToggleTurnSignal={toggleTurnSignal}
        onChangeHeaterMode={handleChangeHeaterMode}
        onToggleAC={handleToggleAC}
        onToggleRecirc={handleToggleRecirc}
        onToggleEngine={handleToggleEngine}
        onToggleWindow={handleToggleWindow}
        onToggleTrailerHitch={handleToggleTrailerHitch}
        onToggleRoadTrainLights={handleToggleRoadTrainLights}
        onCycleDiffLock={() => {
          inputRef.current.diffLockToggle = true;
        }}
      />

      {/* GAS STATION, ENGINE BAY, CRANE & VACUUM MODALS (lazy-loaded) */}
      <React.Suspense fallback={null}>
      {isFuelNozzleModalOpen && (
      <FuelNozzleSelectorModal
        isOpen={isFuelNozzleModalOpen}
        onClose={() => setIsFuelNozzleModalOpen(false)}
        pump={activeGasPump}
        onSelectNozzle={(fuelType) => {
          const p = playerRef.current;
          if (p && activeGasPump) {
            takePumpNozzle(p, activeGasPump, fuelType);
            const grade = FUEL_GRADES[fuelType];
            addPlayerNotification(
              p,
              `Взят пистолет (${grade.nameRu}). Подойдите к лючку бензобака и нажмите ПКМ или удерживайте палец на горловине.`,
              'info');
            setIsFuelNozzleModalOpen(false);
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
      />
      )}

      {/* GAS STATION: CASHIER POS TERMINAL MODAL */}
      {isGasStationCashierModalOpen && worldRef.current && playerRef.current && (
        <GasStationCashierModal
          isOpen={isGasStationCashierModalOpen}
          onClose={() => setIsGasStationCashierModalOpen(false)}
          world={worldRef.current}
          player={playerRef.current}
          onPayAndFuel={(pumpId, liters, fuelType, totalCost) => {
            const p = playerRef.current;
            const w = worldRef.current;
            if (!p || !w) return;

            const pump = w.gasPumps?.find((gp) => gp.id === pumpId);
            if (!pump) return;

            const veh = w.vehicles?.find((v) => v.id === pump.connectedVehicleId);
            const success = deductPlayerCash(p, totalCost);
            if (!success) {
              addPlayerNotification(p, 'Недостаточно денег для оплаты топлива!', 'warning');
              return;
            }

            const grade = FUEL_GRADES[fuelType];
            startGasPumpFueling(pump, liters, fuelType, veh);
            addPlayerNotification(
              p,
              `Оплачено ${totalCost.toLocaleString()} ₽. Заправка ${liters} л [${grade.nameRu}] на колонке №${pump.pumpNumber} началась!`,
              'info');
            setVitalsRefreshTick((t) => t + 1);
          }}
        />
      )}

      {/* UNDER-HOOD ENGINE BAY INSPECTION MODAL */}
      {isEngineBayOpen && engineBayVehicle && playerRef.current && worldRef.current && (
        <EngineBayModal
          isOpen={isEngineBayOpen}
          onClose={() => setIsEngineBayOpen(false)}
          vehicle={engineBayVehicle}
          player={playerRef.current}
          groundItems={worldRef.current.groundItems || []}
          onUpdateVehicle={(updatedV) => {
            const idx = worldRef.current?.vehicles?.findIndex((v) => v.id === updatedV.id);
            if (idx !== undefined && idx >= 0 && worldRef.current?.vehicles) {
              worldRef.current.vehicles[idx] = updatedV;
            }
            setEngineBayVehicle({ ...updatedV });
            setVitalsRefreshTick((t) => t + 1);
          }}
          onUpdatePlayer={(updatedP) => {
            playerRef.current = updatedP;
            setVitalsRefreshTick((t) => t + 1);
          }}
          addNotification={(text, type) => {
            if (playerRef.current) {
              addPlayerNotification(playerRef.current, text, type);
              setVitalsRefreshTick((t) => t + 1);
            }
          }}
        />
      )}

      {/* TRUCK CRANE OUTRIGGERS GROUND STATION MODAL */}
      {isCraneOutriggersModalOpen && (
        <CraneOutriggersModal
          isOpen={isCraneOutriggersModalOpen}
          onClose={() => setIsCraneOutriggersModalOpen(false)}
          vehicle={craneOutriggersVehicle || (worldRef.current && playerRef.current ? (worldRef.current.vehicles.find(v => v.id === playerRef.current?.currentVehicleId) || worldRef.current.vehicles.find(v => isVehicleCraneTruck(v) && Math.hypot(v.x - (playerRef.current?.x || 0), v.y - (playerRef.current?.y || 0)) < 150)) : null) || null}
          player={playerRef.current}
          world={worldRef.current}
          onForceUpdate={() => setVitalsRefreshTick((t) => t + 1)}
        />
      )}

      {/* VACUUM PUMP CONTROL POST (four-way cock and compound gauge) */}
      {isVacuumPumpModalOpen && vacuumPumpVehicle && (
        <VacuumPumpModal
          isOpen={isVacuumPumpModalOpen}
          onClose={() => setIsVacuumPumpModalOpen(false)}
          vehicle={vacuumPumpVehicle}
          player={playerRef.current}
          world={worldRef.current}
          onForceUpdate={() => setVitalsRefreshTick((t) => t + 1)}
        />
      )}
      </React.Suspense>

      {/* MOBILE LONG-TAP MINIMAL WHITE PROGRESS RING (NO TEXT) */}
      {longTapVisual && (
        <div
          key={longTapVisual.id}
          className="fixed pointer-events-none z-[60] -translate-x-1/2 -translate-y-1/2"
          style={{ left: longTapVisual.x, top: longTapVisual.y }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" className="drop-shadow-[0_0_6px_rgba(255,255,255,0.45)]">
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(0,0,0,0.42)" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.4" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="rgba(255,255,255,0.96)"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeDasharray="138.23"
              strokeDashoffset="138.23"
              transform="rotate(-90 28 28)"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="138.23"
                to="0"
                dur="0.38s"
                fill="freeze"
              />
            </circle>
          </svg>
        </div>
      )}

      {/* FAINTING & CONCUSSION OVERLAY (Only for non-evacuation faints) */}
      {playerRef.current?.isFainting && !playerRef.current?.needsHospitalEvacuation && (
        <div 
          id="fainting-overlay"className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[10000] bg-slate-950/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-rose-500/40 text-white flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-8 h-8 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
            <Heart className="w-4 h-4 animate-ping"/>
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
          id="hospital-overlay"className="fixed inset-0 z-[10000] bg-slate-950/92 backdrop-blur-2xl flex flex-col items-center justify-center p-4 text-white animate-in fade-in duration-500 overflow-y-auto">
          <div className="relative flex flex-col max-w-2xl w-full bg-slate-900/95 border border-sky-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-sky-950/60 my-auto">
            {/* Hospital Header */}
            <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-lg shadow-sky-500/10">
                  <Ambulance className="w-7 h-7"/>
                </div>
                <div className="text-left">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-sky-400 bg-sky-950/80 border border-sky-800/60 px-2.5 py-0.5 rounded-full uppercase mb-1">
                    <Activity className="w-3 h-3 text-emerald-400 animate-pulse"/> Отделение Реанимации и Интенсивной Терапии (ОРИТ)
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
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50': 'bg-sky-950/80 text-sky-300 border-sky-600/50 animate-pulse'}`}>
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? 'СТАБИЛИЗИРОВАН': 'ИНТЕНСИВНАЯ ТЕРАПИЯ'}
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
                  <Heart className="w-3 h-3 text-rose-500 animate-ping"/> Пульс (ЧСС)
                </div>
                <div className="text-lg font-mono font-black text-rose-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '74': '88'} <span className="text-xs font-normal text-slate-400">BPM</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-sky-400"/> Давление (АД)
                </div>
                <div className="text-lg font-mono font-black text-sky-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '120/80': '105/65'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400"/> Сатурация (SpO2)
                </div>
                <div className="text-lg font-mono font-black text-emerald-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? '99%': '94%'}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-400"/> Капельница
                </div>
                <div className="text-lg font-mono font-black text-amber-300 mt-0.5">
                  {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? 'Окончена': '250 мл/ч'}
                </div>
              </div>
            </div>

            {/* Treatment Progress & Stages Tracker */}
            <div className="mb-5 p-4 rounded-2xl bg-slate-950/70 border border-sky-500/20 text-left">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-sky-400"/> Прогресс Комплексной Терапии
                </div>
                <span className="text-xs font-mono font-black text-sky-400">
                  {Math.floor(playerRef.current.hospitalTreatmentProgress || 0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 mb-3">
                <div 
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300 shadow-lg shadow-sky-500/30"style={{ width: `${Math.min(100, Math.max(5, playerRef.current.hospitalTreatmentProgress || 0))}%`}}
                />
              </div>

              {/* 4 Interactive Stages */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 25 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300': 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                  <span className="font-bold">1. Анестезия</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 25 ? 'Выполнено': 'В процессе...'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 50 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300': 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                  <span className="font-bold">2. Инфузия</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 50 ? 'Выполнено': (playerRef.current.hospitalTreatmentProgress || 0) >= 25 ? 'В процессе...': 'Ожидание'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 75 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300': 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                  <span className="font-bold">3. Обработка ран</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 75 ? 'Выполнено': (playerRef.current.hospitalTreatmentProgress || 0) >= 50 ? 'В процессе...': 'Ожидание'}</span>
                </div>

                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  (playerRef.current.hospitalTreatmentProgress || 0) >= 100 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300': 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
                  <span className="font-bold">4. Стабилизация</span>
                  <span className="text-[9px] text-slate-400">{(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? 'Выполнено': (playerRef.current.hospitalTreatmentProgress || 0) >= 75 ? 'В процессе...': 'Ожидание'}</span>
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
                  className="mt-3 w-full py-2 px-3 rounded-xl bg-sky-900/40 hover:bg-sky-800/60 border border-sky-500/30 text-sky-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                  <Zap className="w-3.5 h-3.5 text-amber-400"/> Ускорить процедуры реанимации
                </button>
              )}
            </div>

            {/* Diagnosis & Report */}
            {playerRef.current?.evacDiagnosis && (
              <div className="space-y-3.5 text-left mb-5">
                {/* Primary Diagnosis */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-rose-500/30">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500"/> Клинический Диагноз
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
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/> {p}
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
                      addItemToPlayer(playerRef.current, createItem('panthenol', 1));
                      addItemToPlayer(playerRef.current, createItem('spasatel_ointment', 1));
                      addItemToPlayer(playerRef.current, createItem('painkillers', 1));
                    } else if (cause === 'fractures_shock') {
                      addItemToPlayer(playerRef.current, createItem('splint', 1));
                      addItemToPlayer(playerRef.current, createItem('painkillers', 1));
                      addItemToPlayer(playerRef.current, createItem('antiseptic', 1));
                    } else if (cause === 'blood_loss') {
                      addItemToPlayer(playerRef.current, createItem('bandage', 1));
                      addItemToPlayer(playerRef.current, createItem('bandage', 1));
                    } else {
                      addItemToPlayer(playerRef.current, createItem('painkillers', 1));
                      addItemToPlayer(playerRef.current, createItem('bandage', 1));
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
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98]': 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'}`}
            >
              {(playerRef.current.hospitalTreatmentProgress || 0) >= 100 ? (
                <> ВСТАТЬ С КОЙКИ / ВЫПИСАТЬСЯ В ГОРОД</>
              ) : (
                <> Идет интенсивная терапия ({Math.floor(playerRef.current.hospitalTreatmentProgress || 0)}%)...</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODERN CREATIVE MODE MODAL (lazy-loaded) */}
      <React.Suspense fallback={null}>
      {isCreativeMode && !isMainMenuOpen && !activePlacement && (
      <CreativeMenuModal
        isOpen={isCreativeMode && !isMainMenuOpen && !activePlacement}
        onClose={() => {
          setIsCreativeMode(false);
          setIsFlying(false);
          setIsInvincible(false);
          setActivePlacement(null);
          activePlacementRef.current = null;
          const p = playerRef.current;
          if (p) {
            addPlayerNotification(p, 'Режим Творчества выключен.', 'warning');
          }
        }}
        creativeTab={creativeTab}
        setCreativeTab={setCreativeTab}
        creativeVehicleColor={creativeVehicleColor}
        setCreativeVehicleColor={(col) => {
          setCreativeVehicleColor(col);
          if (activePlacement && activePlacement.type === 'vehicle') {
            setActivePlacement({ ...activePlacement, color: col });
          }
        }}
        onSelectVehicleForPlacement={(key, nameRu, color) => {
          setActivePlacement({
            type: 'vehicle',
            id: key,
            nameRu,
            angle: 0,
            color
          });
        }}
        onSpawnVehicleNearPlayer={(key, color, autoEnter) => {
          handleSpawnVehicleDirectly(key, color, autoEnter);
        }}
        activePlacement={activePlacement}
        onSelectPropForPlacement={(propId, nameRu) => {
          setActivePlacement({
            type: 'prop',
            id: propId,
            nameRu,
            angle: 0
          });
        }}
        itemSearch={creativeItemSearch}
        setItemSearch={setCreativeItemSearch}
        onGiveItem={(key, count) => {
          const p = playerRef.current;
          if (!p) return;
          const created = createItem(key, count, undefined, true);
          const success = addItemToPlayer(p, created);
          if (success) {
            addPlayerNotification(p, `Получено: ${created.nameRu || created.name} x${count}`, 'pickup');
            sound.playUseItem();
          } else {
            addPlayerNotification(p, 'Инвентарь заполнен!', 'warning');
          }
        }}
        isFlying={isFlying}
        onToggleFlying={() => {
          const val = !isFlying;
          setIsFlying(val);
          const p = playerRef.current;
          if (p) {
            addPlayerNotification(p, val ? 'Полёт активирован!' : 'Режим ходьбы.', val ? 'info' : 'warning');
          }
        }}
        isInvincible={isInvincible}
        onToggleInvincible={() => {
          const val = !isInvincible;
          setIsInvincible(val);
          const p = playerRef.current;
          if (p) {
            addPlayerNotification(p, val ? 'Вы бессмертны! Травмы очищены.' : 'Режим смертности включен.', val ? 'heal' : 'warning');
          }
        }}
        isGridMode={isGridMode}
        onToggleGridMode={() => {
          const cam = cameraRef.current;
          cam.gridMode = !cam.gridMode;
          const val = !!cam.gridMode;
          setIsGridMode(val);
          const p = playerRef.current;
          if (p) {
            addPlayerNotification(p, `Режим сетки (Grid Mode) ${val ? 'ВКЛ' : 'ВЫКЛ'}`, val ? 'info' : 'warning');
          }
        }}
        isCleanMode={isCleanMode}
        onToggleCleanMode={() => {
          const val = !isCleanMode;
          setIsCleanMode(val);
          isCleanModeRef.current = val;
          const world = worldRef.current;
          if (world) {
            world.cleanMode = val;
            if (val && world.particles) {
              world.particles = world.particles.filter(p => p.type !== 'engine_smoke' && p.type !== 'tire_smoke' && p.type !== 'exhaust');
            }
          }
          const p = playerRef.current;
          if (p) {
            p.isCleanMode = val;
            if (val) {
              p.needs.health = 100;
              if (p.bodyState) {
                p.bodyState.painLevel = 0;
                p.bodyState.bloodLoss = 0;
                p.bodyState.shockLevel = 0;
              }
            }
            addPlayerNotification(p, val ? 'Чистый режим ВКЛ! Дым/пар убраны, урон отключен.' : 'Чистый режим ВЫКЛ.', val ? 'info' : 'warning');
          }
        }}
        onGiveCash={(amount) => {
          const p = playerRef.current;
          if (p) {
            addPlayerCash(p, amount);
            addPlayerNotification(p, `Получено ₽${amount.toLocaleString('ru-RU')} из резерва!`, 'pickup');
            sound.playTurnSignalTick(true);
            setVitalsRefreshTick(t => t + 1);
          }
        }}
        onOpenCalendar={() => {
          sound.playButtonPress();
          setIsDateTimePickerOpen(true);
        }}
        calendar={calendar}
        timeHour={timeHour}
        onStepDay={handleStepGameDay}
        onRepairAllVehicles={() => {
          handleResetAllVehiclesDamage();
          const p = playerRef.current;
          if (p) {
            addPlayerNotification(p, 'Все повреждения транспорта устранены!', 'info');
          }
        }}
        onClearCreatedSpawns={() => {
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
      />
      )}

      {/* PLACEMENT WORLD PREVIEW HUD */}
      {isCreativeMode && activePlacement && !isMainMenuOpen && (
        <CreativePlacementHud
          placement={activePlacement}
          onCancel={() => {
            setActivePlacement(null);
            activePlacementRef.current = null;
          }}
        />
      )}
      </React.Suspense>

      {/* Pause Menu Overlay */}
      {isPauseMenuOpen && !isMainMenuOpen && (
        <PauseMenu
          session={buildPauseSession()}
          currentUser={currentUser}
          settings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            try {
              localStorage.setItem('city_sim_game_settings', JSON.stringify(newSettings));
            } catch {}
          }}
          onResume={() => setIsPauseMenuOpen(false)}
          onSave={() => {
            handleCreateSave();
            const p = playerRef.current;
            if (p) addPlayerNotification(p, 'Игра успешно сохранена!', 'info');
          }}

          onExitToMainMenu={handleExitToMainMenu}
          onOpenPerformanceTest={() => {
            setIsPauseMenuOpen(false);
            setIsPerfTestOpen(true);
          }}
          onOpenCollisionTest={() => {
            setIsPauseMenuOpen(false);
            setIsCollisionTestOpen(true);
          }}
          onOpenFriends={() => {
            setIsPauseMenuOpen(false);
            setIsFriendsModalOpen(true);
          }}
        />
      )}

      {/* Server Per-Player Nickname Auth & Rejection Modal */}
      <ServerAuthModal
        isMainMenuOpen={isMainMenuOpen}
        onDisconnectToMenu={handleExitToMainMenu}
      />

      {/* Main Menu Overlay */}
      {isMainMenuOpen && (
        <MainMenu
          initialScreen={mainMenuInitialScreen}
          onResume={() => setIsMainMenuOpen(false)}
          saves={saves}
          onLoadSave={(id) => handleLoadSave(id)}
          onDeleteSave={handleDeleteSave}
          onNewGame={({ spawnId, saveName, timeHour: newTime, weather: newWeather, mode, vehicleType, vehicleColor, powertrain }) => {
            handleNewGame({ spawnId, saveName, timeHour: newTime, weather: newWeather, mode, vehicleType, vehicleColor, powertrain });
          }}
          onJoinServer={(opts) => handleJoinServerWorld(opts)}
          onCreateServer={(opts) => handleCreateServerWorld(opts)}
          onStartSavedServer={(backup) => handleStartSavedServer(backup)}
          currentSettings={settings}
          onUpdateSettings={(newSettings) => {
            setSettings(newSettings);
            try {
              localStorage.setItem('city_sim_game_settings', JSON.stringify(newSettings));
            } catch {}
          }}
          currentUser={currentUser}
        />
      )}

      {/* Fullscreen Loading / Saving Screen */}
      <GameLoadingScreen state={loadingScreen} />

      {/* Online, Diagnostics, Profile, Real Estate & Storage Modals (lazy-loaded) */}
      <React.Suspense fallback={null}>
      {isOnlineModalOpen && (
        <OnlineModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          onOpenFriends={() => setIsFriendsModalOpen(true)}
          onJoinServer={(opts) => handleJoinServerWorld(opts)}
          onCreateServer={(opts) => handleCreateServerWorld(opts)}
          onSaveHostedServer={() => persistActiveHostedServer()}
        />
      )}

      {/* In-game acceleration run tester (time measurement + config + export) */}
      {isPerfTestOpen && worldRef.current && (
        <PerformanceTest
          worldRef={worldRef}
          playerRef={playerRef}
          onClose={() => setIsPerfTestOpen(false)}
        />
      )}

      {/* In-game collision & softbody physics telemetry analyzer */}
      {isCollisionTestOpen && worldRef.current && (
        <CollisionTest
          worldRef={worldRef}
          playerRef={playerRef}
          onClose={() => setIsCollisionTestOpen(false)}
        />
      )}

      {/* Friends & Social System Modal */}
      {isFriendsModalOpen && (
        <FriendsModal
          isOpen={isFriendsModalOpen}
          onClose={() => setIsFriendsModalOpen(false)}
          onJoinRoom={(code) => {
            setIsFriendsModalOpen(false);
            void handleJoinServerWorld({ roomCode: code, nickname: onlineManager.localPlayerName });
          }}
        />
      )}
      </React.Suspense>

      {/* Real-time World Invite Toast Notification */}
      <WorldInviteToast
        onJoinRoom={(code) => {
          void handleJoinServerWorld({ roomCode: code, nickname: onlineManager.localPlayerName });
        }}
      />

      <React.Suspense fallback={null}>
      {/* Firebase User Profile & Cloud Saves Modal */}
      {isUserProfileModalOpen && (
        <UserProfileModal
          isOpen={isUserProfileModalOpen}
          onClose={() => setIsUserProfileModalOpen(false)}
          currentUser={currentUser}
          currentPlayerData={playerRef.current ? {
            money: getPlayerCash(playerRef.current),
            health: playerRef.current.needs?.health || 100,
            position: { x: playerRef.current.x, y: playerRef.current.y },
            inventory: playerRef.current.inventory || [],
            needs: playerRef.current.needs
          } : undefined}
          onLoadCloudSaveData={(cloudData) => {
            const p = playerRef.current;
            if (p) {
              p.x = cloudData.position.x;
              p.y = cloudData.position.y;
              if (p.needs) p.needs.health = cloudData.health;
              if (cloudData.inventory) p.inventory = cloudData.inventory;
              if (cloudData.money !== undefined) {
                p.cash = cloudData.money;
              }
              addPlayerNotification(p, 'Облачное сохранение успешно загружено!', 'pickup');
              setVitalsRefreshTick(t => t + 1);
            }
          }}
        />
      )}

      {/* Real Estate Purchase & Agency Modal */}
      {isRealEstateModalOpen && playerRef.current && (
        <RealEstateAgencyModal
          isOpen={isRealEstateModalOpen}
          onClose={() => setIsRealEstateModalOpen(false)}
          player={playerRef.current}
          onSetGpsDestination={handleSetGpsTarget}
          world={worldRef.current}
          onPropertyPurchased={() => {
            setVitalsRefreshTick(t => t + 1);
          }}
        />
      )}

      {/* Property Official Legal Documents Inspection Modal */}
      {isPropertyDocumentModalOpen && (
        <PropertyDocumentModal
          isOpen={isPropertyDocumentModalOpen}
          onClose={() => {
            setIsPropertyDocumentModalOpen(false);
            setSelectedPropertyDocItem(null);
          }}
          documentItem={selectedPropertyDocItem}
        />
      )}

      {/* Apartment Furniture Storage / Kitchen Table / Kitchen Stove Modals */}
      {isFurnitureStorageOpen && furnitureStorageData && playerRef.current && (() => {
        const activeStorage = getFurnitureStorage(
          furnitureStorageData.buildingId,
          furnitureStorageData.floor,
          furnitureStorageData.furnitureIndex,
          furnitureStorageData.furnitureType,
          furnitureStorageData.aptId,
          furnitureStorageData.customTitle,
          furnitureStorageData.subSlot
        );
        const handleCloseFurn = () => {
          setIsFurnitureStorageOpen(false);
          setFurnitureStorageData(null);
        };
        const handleFurnChanged = () => {
          setVitalsRefreshTick(t => t + 1);
          saveFurnitureStoragesToLocalStorage();
        };

        if (furnitureStorageData.furnitureType === 'stove') {
          return (
            <KitchenStoveModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
            />
          );
        }

        if (furnitureStorageData.furnitureType === 'sink') {
          return (
            <KitchenSinkModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
              onOpenParentCounter={
                furnitureStorageData.subSlot === 'sink'
                  ? () => {
                      sound.playUseItem();
                      setFurnitureStorageData(prev =>
                        prev
                          ? {
                              ...prev,
                              furnitureType: 'kitchen_counter',
                              subSlot: undefined,
                              hasBuiltInSink: true,
                              customTitle: 'Кухонный гарнитур',
                            }
                          : null
                      );
                    }
                  : undefined
              }
            />
          );
        }

        if (furnitureStorageData.furnitureType === 'bath') {
          return (
            <BathtubModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
            />
          );
        }

        if (furnitureStorageData.furnitureType === 'washing_machine') {
          return (
            <WashingMachineModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
            />
          );
        }

        if (furnitureStorageData.furnitureType === 'microwave') {
          return (
            <MicrowaveModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
            />
          );
        }

        if (furnitureStorageData.furnitureType === 'cooler') {
          return (
            <WaterCoolerModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
            />
          );
        }

        if (
          furnitureStorageData.furnitureType === 'kitchen_counter' ||
          furnitureStorageData.furnitureType === 'table'
        ) {
          return (
            <KitchenTableModal
              isOpen={isFurnitureStorageOpen}
              onClose={handleCloseFurn}
              storage={activeStorage}
              player={playerRef.current}
              world={worldRef.current}
              onInventoryUpdated={handleFurnChanged}
              onVitalsChange={handleFurnChanged}
              onOpenBuiltInSink={
                furnitureStorageData.furnitureType === 'kitchen_counter'
                  ? () => {
                      sound.playUseItem();
                      setFurnitureStorageData(prev =>
                        prev
                          ? {
                              ...prev,
                              furnitureType: 'sink',
                              subSlot: 'sink',
                              hasBuiltInSink: true,
                              customTitle: 'Раковина кухонного гарнитура',
                            }
                          : null
                      );
                    }
                  : undefined
              }
            />
          );
        }

        return (
          <FurnitureStorageModal
            isOpen={isFurnitureStorageOpen}
            onClose={handleCloseFurn}
            storage={activeStorage}
            player={playerRef.current}
            world={worldRef.current}
            buildingId={furnitureStorageData.buildingId}
            floor={furnitureStorageData.floor}
            furnitureIndex={furnitureStorageData.furnitureIndex}
            furnitureType={furnitureStorageData.furnitureType}
            aptId={furnitureStorageData.aptId}
            customTitle={furnitureStorageData.customTitle}
            onInventoryUpdated={handleFurnChanged}
            onVitalsChange={handleFurnChanged}
          />
        );
      })()}
      </React.Suspense>

      {/* Bed Sleeping & Night Awakening Overlay */}
      {bedSleepState && bedSleepState.isActive && playerRef.current && (
        <BedSleepOverlay
          bedState={bedSleepState}
          player={playerRef.current}
          timeHour={timeHour}
          onStandUp={() => {
            const p = playerRef.current;
            if (p && bedSleepStateRef.current) {
              const res = standUpFromBed(bedSleepStateRef.current, p);
              setBedSleepState(res);
              bedSleepStateRef.current = res;
              setVitalsRefreshTick(t => t + 1);
            }
          }}
          onSleep={() => {
            const p = playerRef.current;
            if (p && bedSleepStateRef.current) {
              const res = triggerFallingAsleep(bedSleepStateRef.current, p);
              setBedSleepState(res);
              bedSleepStateRef.current = res;
              setVitalsRefreshTick(t => t + 1);
            }
          }}
          onWakeUp={() => {
            const p = playerRef.current;
            if (p && bedSleepStateRef.current) {
              const res = finishSleep(bedSleepStateRef.current, p);
              setBedSleepState(res);
              bedSleepStateRef.current = res;
              setVitalsRefreshTick(t => t + 1);
            }
          }}
          onFallBackAsleep={() => {
            const p = playerRef.current;
            if (p && bedSleepStateRef.current) {
              const res = triggerFallingAsleep(bedSleepStateRef.current, p);
              setBedSleepState(res);
              bedSleepStateRef.current = res;
              setVitalsRefreshTick(t => t + 1);
            }
          }}
        />
      )}

      {/* Online Chat Overlay */}
      {!isMainMenuOpen && !isPauseMenuOpen && (
        <ChatOverlay
          isChatFocused={isChatFocused}
          onSetChatFocused={setIsChatFocused}
          isMobileTouch={isMobileTouch}
        />
      )}

      {/* Crash Alert Toast from Previous Session */}
      {crashToastReport && (
        <CrashAlertToast
          crashReport={crashToastReport}
          onOpenDiagnostics={() => {
            setIsCrashDiagnosticsOpen(true);
            setCrashToastReport(null);
            crashLogger.dismissPreviousCrashNotification();
          }}
          onDismiss={() => {
            setCrashToastReport(null);
            crashLogger.dismissPreviousCrashNotification();
          }}
        />
      )}

      {/* Crash Diagnostics & Date/Time Picker Modals (lazy-loaded) */}
      <React.Suspense fallback={null}>
      {isCrashDiagnosticsOpen && (
        <CrashDiagnosticsModal
          isOpen={isCrashDiagnosticsOpen}
          onClose={() => setIsCrashDiagnosticsOpen(false)}
          activeVehicle={worldRef.current?.vehicles?.find(v => v.id === playerRef.current?.currentVehicleId) || worldRef.current?.vehicles?.[0] || null}
          currentSnapshot={{
            timestamp: new Date().toLocaleTimeString(),
            timeMs: Date.now(),
            fps: fps,
            playerPos: {
              x: Math.round(playerRef.current?.x || 0),
              y: Math.round(playerRef.current?.y || 0),
              inVehicle: !!playerRef.current?.isInVehicle,
              vehicleId: playerRef.current?.currentVehicleId || null,
              floor: playerRef.current?.currentFloor || 0
            },
            entities: {
              vehicles: worldRef.current?.vehicles?.length || 0,
              pedestrians: worldRef.current?.pedestrians?.length || 0,
              particles: worldRef.current?.particles?.length || 0,
              skidMarks: worldRef.current?.skidMarks?.length || 0,
              stains: worldRef.current?.stains?.length || 0,
              groundItems: worldRef.current?.groundItems?.length || 0
            }
          }}
          onEmergencyPurge={() => {
            if (worldRef.current) {
              worldRef.current.particles = [];
              if (worldRef.current.stains) {
                worldRef.current.stains = worldRef.current.stains.slice(0, 30);
              }
              if (worldRef.current.skidMarks) {
                worldRef.current.skidMarks = worldRef.current.skidMarks.slice(0, 100);
              }
            }
            sound.purgeAudioGraph();
            clearInteriorCanvasCache();
          }}
        />
      )}

      {/* Date, Time & Astronomical Calendar Picker Modal */}
      {isDateTimePickerOpen && (
        <DateTimePickerModal
          currentCalendar={calendar}
          currentWeather={weather}
          isTimeAutoCycling={isTimeAutoCycling}
          onApply={handleApplyDateAndTimeAndWeather}
          onToggleTimeAutoCycling={() => {
            setIsTimeAutoCycling((prev) => !prev);
            const p = playerRef.current;
            if (p) {
              addPlayerNotification(p, !isTimeAutoCycling ? 'Ход времени: ВКЛ' : 'Ход времени: ПАУЗА', 'info');
            }
          }}
          onClose={() => setIsDateTimePickerOpen(false)}
        />
      )}
      </React.Suspense>
    </div>
  );
}

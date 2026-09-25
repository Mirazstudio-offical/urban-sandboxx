import React, { useEffect, useRef, useState } from 'react';
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
  CarType
} from './types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, createDefaultVehicleDamage, ensureVehicleDamage, getVehicleFuelCapPosition, isTrailerVehicle, PX_S_TO_SPEED_KMH, hasRoadTrainLights, toggleAxleDiffLock, cycleVehicleDiffLock, getVehicleDiffCapabilities } from './vehicleHelpers';
import { loadMap, sanitizeWorldVehicles } from './loadMap';
import { SpatialGrid } from './spatialGrid';
import { updateAITraffic, updatePedestrians, updateTrafficLights } from './aiTraffic';
import { RailwaySignalingSystem } from './railwaySignalingSystem';
import { TrainSystem } from './trainSystem';
import { 
  getAllBuildingEntrances,
  updateBreakablePropsAndLivingWorld,
  updatePlayerNeedsAndVitals,
  updatePlayerPedestrianPhysics, 
  updateSkidMarksAndParticles, 
  updateVehiclePhysics,
  toggleTrailerHitch,
  hitchTrailerToVehicle,
  unhitchTrailerFromVehicle
} from './physics';
import { GameRenderer } from './renderer';
import { getBuildingFloorsCount, getBuildingLayout, constrainPlayerToInterior, clearInteriorCanvasCache } from './buildingInteriors';
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
  useHandItemOnPlayer,
  stowItemFromHandToPockets,
  swapPlayerHands,
  ITEM_CATALOG,
  addPlayerCash,
  getVehicleRequiredKeyType,
  takeOutKeyFromVehicle,
  insertKeyToVehicle
} from './items';
import { defaultBodyState } from './sensations';
import { TrafficConsole } from './components/TrafficConsole';
import { FullScreenMap } from './components/FullScreenMap';
import { LandscapeGuard } from './components/LandscapeGuard';
import { MobileTouchControls } from './components/MobileTouchControls';
import { MainMenu } from './components/MainMenu';
import { PauseMenu } from './components/PauseMenu';
import { PlayerNeedsHUD } from './components/PlayerNeedsHUD';
import { InventoryModal } from './components/InventoryModal';
import { SelfInspectionModal } from './components/SelfInspectionModal';
import { LimbTreatmentModal } from './components/LimbTreatmentModal';
import { ShopModal, ShopItem, CITY_SHOPS, CityShop } from './components/ShopModal';
import { CarDealershipModal } from './components/CarDealershipModal';
import { RadialMenu } from './components/RadialMenu';
import { SpeedometerHUD } from './components/SpeedometerHUD';
import { PerformanceProfiler } from './components/PerformanceProfiler';
import { PhoneModal } from './components/PhoneModal';
import { performanceConfig } from './performanceConfig';
import { FuelNozzleSelectorModal } from './components/FuelNozzleSelectorModal';
import { GasStationCashierModal } from './components/GasStationCashierModal';
import { EngineBayModal } from './components/EngineBayModal';
import { ContextInteractionHUD } from './components/ContextInteractionHUD';
import { findActiveInteraction, InteractionTarget } from './interactionSystem';
import { OnlineModal } from './components/OnlineModal';
import { UserProfileModal } from './components/UserProfileModal';
import { FriendsModal } from './components/FriendsModal';
import { WorldInviteToast } from './components/WorldInviteToast';
import { RealEstateAgencyModal } from './components/RealEstateAgencyModal';
import { PropertyDocumentModal } from './components/PropertyDocumentModal';
import { FurnitureStorageModal } from './components/FurnitureStorageModal';
import { BedSleepOverlay } from './components/BedSleepOverlay';
import { 
  BedSleepState, 
  startLyingOnBed, 
  triggerFallingAsleep, 
  standUpFromBed, 
  updateBedSleepCycle, 
  finishSleep 
} from './bedSleepSystem';
import { toggleApartmentLock, getApartmentById, getCityApartments } from './propertySystem';
import { 
  buildFurnitureStorageId, 
  getExistingFurnitureStorage, 
  deleteFurnitureStorage,
  getFurnitureStorage,
  exportFurnitureStorageData,
  importFurnitureStorageData,
  saveFurnitureStoragesToLocalStorage
} from './furnitureStorageSystem';
import { ChatOverlay } from './components/ChatOverlay';
import { onlineManager, OnlineStatus } from './onlineSystem';
import { auth, onAuthStateChanged, ensureUserProfileExists, updateUserOnlineStatus, type User } from './firebase';
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
import { 
  Activity,
  AlertTriangle,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Car,
  Check,
  Cloud,
  CloudLightning,
  CloudRain,
  Compass, 
  Eye, 
  Flame,
  Fuel,
  Gauge, 
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
  Smartphone,
  Sun, 
  Sunrise, 
  Terminal,
  Thermometer,
  Utensils,
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
  Train
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
    id: 'railway_station_loc',
    name: 'Railway Station Stepnaya',
    nameRu: 'Ж/Д Вокзал «Станция Степная»',
    x: 11120,
    y: 5640,
    description: 'Новый вокзальный комплекс: двухэтажный вокзал РЖД, платформы, поезда, переезд и путевая сеть',
    icon: <Train className="w-8 h-8 text-sky-400"/>
  },
  {
    id: 'real_estate_agency_loc',
    name: 'Real Estate Agency GlavNedvizhimost',
    nameRu: 'Агентство Недвижимости «ГлавНедвижимость»',
    x: 5030,
    y: 4610,
    description: 'Официальный риелторский центр и Росреестр: покупка квартир, выдача ключей и ЕГРН',
    icon: <Building2 className="w-8 h-8 text-yellow-400"/>
  },
  {
    id: 'car_dealership_loc',
    name: 'Car Dealership & Showroom',
    nameRu: 'Автосалон "Премиум Авто"',
    x: 252,
    y: 5600,
    description: 'Официальный автосалон: выставка авто, выбор цвета и КПП, покупка с ПТС и ключом',
    icon: <Car className="w-8 h-8 text-amber-400"/>
  },
  {
    id: 'central_park',
    name: 'Central Park Promenade',
    nameRu: 'Центральный Парк (Фонтан & Сквер)',
    x: 4400,
    y: 2400,
    description: 'Парковый фонтан, аллеи со скамейками, сквер и прогулочные зоны',
    icon: <TreePine className="w-8 h-8 text-emerald-400"/>
  },
  {
    id: 'downtown_plaza',
    name: 'Downtown Commercial Plaza',
    nameRu: 'Деловой Центр (Парковка & Небоскребы)',
    x: 4000,
    y: 2000,
    description: 'Оживленный перекрёсток проспектов, высотные офисы и парковочный комплекс',
    icon: <Building2 className="w-8 h-8 text-slate-400"/>
  },
  {
    id: 'residential_courtyard',
    name: 'Residential Courtyard',
    nameRu: 'Жилой Двор (Многоэтажки & Дворовая парковка)',
    x: 2750,
    y: 2400,
    description: 'Уютный закрытый двор, подъезды, скамейки, урны, баки и припаркованные авто',
    icon: <Home className="w-8 h-8 text-amber-400"/>
  },
  {
    id: 'industrial_district',
    name: 'Freight Logistics Yard',
    nameRu: 'Промзона (Грузовая база & Склады)',
    x: 6400,
    y: 1030,
    description: 'Логистический хаб, стоянки спецтехники, грузовые терминалы и ангары',
    icon: <Truck className="w-8 h-8 text-stone-400"/>
  },
  {
    id: 'pine_forest',
    name: 'Pine Ridge Outpost',
    nameRu: 'Лесной Заповедник & Магазин «Охота»',
    x: 1200,
    y: 1600,
    description: 'Извилистые лесные тропы, сосновый бор, пруды и магазин снаряжения',
    icon: <Map className="w-8 h-8 text-emerald-600"/>
  },
  {
    id: 'highway_junction',
    name: 'Silicon Highway Express',
    nameRu: 'Скоростное Шоссе (4-полосная магистраль)',
    x: 4000,
    y: 4000,
    description: 'Широкая магистраль с непрерывным плотным потоком AI-трафика и светофорами',
    icon: <Navigation className="w-8 h-8 text-sky-400"/>
  },
  {
    id: 'auto_service_pitstop',
    name: 'PIT-STOP Auto Repair Service',
    nameRu: 'Автотехцентр "PIT-STOP" & Тюнинг',
    x: 2400,
    y: 3500,
    description: 'СТО, ремонт двигателя, замена жидкостей, шин и покупка автозапчастей',
    icon: <Wrench className="w-8 h-8 text-amber-500"/>
  },
  {
    id: 'hospital_city_1',
    name: 'City Emergency Hospital #1',
    nameRu: 'Городская Больница №1 / ОРИТ',
    x: 4000,
    y: 2200,
    description: 'Круглосуточный медицинский комплекс, травматология и скорая помощь',
    icon: <HeartPulse className="w-8 h-8 text-rose-500"/>
  },
  {
    id: 'gas_station_main_loc',
    name: 'Grand-Oil Gas Station 24/7',
    nameRu: 'АЗС «Гранд-Ойл» (Минимаркет 24/7)',
    x: 4300,
    y: 3200,
    description: 'Заправка всех видов топлива (АИ-92, 95, 98, ДТ, СУГ) и хот-доги',
    icon: <Fuel className="w-8 h-8 text-blue-500"/>
  },
  {
    id: 'police_station_loc',
    name: 'Central Police Precinct',
    nameRu: 'УВД / Полицейский Участок',
    x: 4000,
    y: 1900,
    description: 'Городское управление внутренних дел и патрульная автостоянка',
    icon: <Shield className="w-8 h-8 text-blue-400"/>
  },
  {
    id: 'fire_station_loc',
    name: 'Fire Station #12',
    nameRu: 'Пожарная Часть №12',
    x: 6400,
    y: 1200,
    description: 'Депо спасателей, тяжелые пожарные грузовики и спасательное оборудование',
    icon: <Flame className="w-8 h-8 text-red-500"/>
  },
  {
    id: 'gallery_mall_loc',
    name: 'Passage Shopping Mall',
    nameRu: 'ТРЦ «Пассаж» (Азимут & Электро-Маркет)',
    x: 3500,
    y: 2400,
    description: 'Крупный Торгово-Развлекательный Центр: продукты, электроника, одежда и кафе',
    icon: <ShoppingBag className="w-8 h-8 text-purple-400"/>
  },
  {
    id: 'garage_coop_loc',
    name: 'Garage Cooperative Vostok-1',
    nameRu: 'Гаражный Кооператив «Восток-1»',
    x: 1200,
    y: 4800,
    description: 'Массив частных кирпичных гаражей, ремонтные ямы и эстакады',
    icon: <Wrench className="w-8 h-8 text-slate-400"/>
  },
  {
    id: 'cottage_district_loc',
    name: 'Pine Ridge Cottage Settlement',
    nameRu: 'Коттеджный Посёлок «Сосновый Бор»',
    x: 4500,
    y: 6400,
    description: 'Тихий частный сектор, загородные дома, коттеджи и живописные улички',
    icon: <Home className="w-8 h-8 text-emerald-400"/>
  },
  {
    id: 'steppe_highway',
    name: 'Steppe Express Highway M-12',
    nameRu: 'Степное Шоссе М-12 (Магистраль 110 км/ч)',
    x: 9500,
    y: 4000,
    description: 'Скоростная 4-полосная автомагистраль через дикую степь с разделительным барьером',
    icon: <Navigation className="w-8 h-8 text-amber-500"/>
  },
  {
    id: 'steppe_village',
    name: 'Village Polynovka',
    nameRu: 'Деревня Полыновка (Полузаброшенная)',
    x: 11480,
    y: 2500,
    description: 'Атмосферная глухая деревня: деревянные избы, колодец с журавлём, клуб и сады',
    icon: <Home className="w-8 h-8 text-emerald-500"/>
  },
  {
    id: 'highway_hub_1',
    name: 'Steppe Interchange Hub 1 (14 km)',
    nameRu: 'Развилка 1: Степной Узел (14-й км)',
    x: 14400,
    y: 4000,
    description: '4-сторонняя скоростная развязка: поворот на Северный Тракт к тайге и Южный объезд',
    icon: <Compass className="w-8 h-8 text-sky-400"/>
  },
  {
    id: 'highway_hub_2',
    name: 'Oasis Motel & Fuel Hub (24 km)',
    nameRu: 'Развилка 2: АЗС Оазис & Мотель (24-й км)',
    x: 24000,
    y: 4000,
    description: 'Загородный комплекс: АЗС «Транзит-Оазис», мотель «Степной Бриз», съезд в Каньон',
    icon: <Fuel className="w-8 h-8 text-emerald-400"/>
  },
  {
    id: 'alpine_pass',
    name: 'Eagle Peak Mountain Pass',
    nameRu: 'Перевал «Орлиный Пик» (Горный серпантин)',
    x: 36000,
    y: 3880,
    description: 'Высокогорная трасса над облаками, крутые виражи перевала, смотровая площадка',
    icon: <Mountain className="w-8 h-8 text-cyan-400"/>
  },
  {
    id: 'canyon_descent',
    name: 'Clay Bluffs & Terraces Serpentine',
    nameRu: 'Урочище «Глинистые Обрывы» (Серпантин)',
    x: 24000,
    y: 15000,
    description: 'Каскад опасных крутых поворотов, геологические разломы и террасы глинистого каньона',
    icon: <Compass className="w-8 h-8 text-amber-600"/>
  },
  {
    id: 'dunes_express',
    name: 'Salt Lake Steppe Express Highway',
    nameRu: 'Озерная Магистраль «Солончаки»',
    x: 32000,
    y: 9330,
    description: 'Скоростная 20-километровая панорамная прямая вдоль котловины Солёного озера и степных просторов',
    icon: <Navigation className="w-8 h-8 text-cyan-500"/>
  },
  {
    id: 'east_gate_terminal',
    name: 'Far East Gate Terminal (48 km)',
    nameRu: 'Восточные Ворота (Терминал 48-й км)',
    x: 48000,
    y: 4000,
    description: 'Дальний рубеж автомагистрали М-12: разворотная петля и пограничный пост',
    icon: <Shield className="w-8 h-8 text-indigo-400"/>
  }
];

function findStreetNameAtPosition(world: GameWorld | null, px: number, py: number): string {
  if (!world || !world.roads) return 'Grand Boulevard';
  for (let i = 0; i < world.roads.length; i++) {
    const road = world.roads[i];
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
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // React State for HUD & Status
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [isInVehicle, setIsInVehicle] = useState<boolean>(false);
  const [activeCarName, setActiveCarName] = useState<string>('');
  const [gear, setGear] = useState<'P'| 'D'| 'R'| 'N'| string>('D');
  const [isMobileTouch, setIsMobileTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart'in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 900;
  });
  const [isMinimapCollapsed, setIsMinimapCollapsed] = useState<boolean>(false);
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
  const [nearbyCarPrompt, setNearbyCarPrompt] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Gas Station System States
  const [isFuelNozzleModalOpen, setIsFuelNozzleModalOpen] = useState<boolean>(false);
  const [activeGasPump, setActiveGasPump] = useState<GasPumpDispenser | null>(null);
  const [isGasStationCashierModalOpen, setIsGasStationCashierModalOpen] = useState<boolean>(false);
  const [isEngineBayOpen, setIsEngineBayOpen] = useState<boolean>(false);
  const [engineBayVehicle, setEngineBayVehicle] = useState<Vehicle | null>(null);
  const [gasStationPrompt, setGasStationPrompt] = useState<string | null>(null);
  const [activeInteraction, setActiveInteraction] = useState<InteractionTarget | null>(null);
  const activeInteractionRef = useRef<InteractionTarget | null>(null);
  const prevInteractionKeyRef = useRef<string>('');
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [trafficCount, setTrafficCount] = useState<number>(0);
  const [pedCount, setPedCount] = useState<number>(0);
  const [minimapRange, setMinimapRange] = useState<number>(550);
  const minimapRangeRef = useRef<number>(550);
  minimapRangeRef.current = minimapRange;

  const [isMinimapExpanded, setIsMinimapExpanded] = useState<boolean>(false);
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

  useEffect(() => {
    const unsub = onlineManager.subscribe(() => {
      setOnlineStatus(onlineManager.status);
      setOnlinePlayerCount(
        onlineManager.getRemotePlayersArray().length + (onlineManager.status === 'connected'? 1 : 0)
      );
    });
    return unsub;
  }, []);

  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(true);
  const [isPauseMenuOpen, setIsPauseMenuOpen] = useState<boolean>(false);
  const isPauseMenuOpenRef = useRef<boolean>(false);
  isPauseMenuOpenRef.current = isPauseMenuOpen;

  const [settings, setSettings] = useState({
    fpsLimit: 60,
    autoSaveInterval: 25,
    timeAutoCycle: true,
    mouseSensitivity: 1.0
  });

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
  const [activePhoneItem, setActivePhoneItem] = useState<InventoryItem | null>(null);
  const activePhoneItemRef = useRef<InventoryItem | null>(null);
  activePhoneItemRef.current = activePhoneItem;

  // Apartment Furniture Storage State
  const [furnitureStorageData, setFurnitureStorageData] = useState<{
    buildingId: string;
    floor: number;
    furnitureIndex: number;
    furnitureType: string;
    aptId?: string;
    customTitle?: string;
  } | null>(null);
  const [isFurnitureStorageOpen, setIsFurnitureStorageOpen] = useState<boolean>(false);

  // Apartment Bed Sleeping & Relaxation State
  const [bedSleepState, setBedSleepState] = useState<BedSleepState | null>(null);
  const bedSleepStateRef = useRef<BedSleepState | null>(null);
  bedSleepStateRef.current = bedSleepState;
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isDealershipOpen, setIsDealershipOpen] = useState<boolean>(false);
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

    sound.setRainAudio(nextWeather === 'rain'|| nextWeather === 'storm');
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
    const currentStreet = findStreetNameAtPosition(world, player.x, player.y);

    let timeString = '12:00';
    let dateString = '01.01.2026';
    try {
      timeString = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit'});
      dateString = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric'});
    } catch (err) {
      const now = new Date();
      timeString = now.toTimeString().slice(0, 5);
      dateString = now.toISOString().slice(0, 10).split('-').reverse().join('.');
    }
    
    const saveName = customName || `Улица: ${currentStreet}`;

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

    // Filter world vehicles to strictly save only vehicles with a linked key / player ownership
    const savedVehicles = (world.vehicles || [])
      .filter(v => keyedVehicleIds.has(v.id) || v.ownerId === 'player'|| Boolean(v.keyId))
      .map(v => ({
        id: v.id,
        keyId: v.keyId,
        keyTier: v.keyTier,
        ownerId: v.ownerId || 'player',
        isLocked: v.isLocked,
        type: v.type,
        x: v.x,
        y: v.y,
        angle: v.angle,
        speed: v.speed,
        color: v.color,
        roofColor: v.roofColor,
        hasGBO: v.hasGBO,
        hasHeavySuspension: (v as any).hasHeavySuspension,
        hasChiptuning: (v as any).hasChiptuning,
        fuelSystem: v.fuelSystem ? { ...v.fuelSystem } : undefined,
        engineState: v.engineState ? { ...v.engineState } : undefined,
        damage: v.damage ? { ...v.damage } : undefined,
        isParked: v.isParked
      }));

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
      needs: player.needs ? JSON.parse(JSON.stringify(player.needs)) : undefined,
      bodyState: player.bodyState ? JSON.parse(JSON.stringify(player.bodyState)) : undefined,
      inventory: player.inventory ? JSON.parse(JSON.stringify(player.inventory)) : undefined,
      equippedClothing: player.equippedClothing ? JSON.parse(JSON.stringify(player.equippedClothing)) : undefined,
      leftHandItem: player.leftHandItem ? JSON.parse(JSON.stringify(player.leftHandItem)) : null,
      rightHandItem: player.rightHandItem ? JSON.parse(JSON.stringify(player.rightHandItem)) : null,
      activeHand: player.activeHand || 'right',
      cash: player.cash || 0,
      selectedHotbarIndex: player.selectedHotbarIndex || 0,
      vehicles: savedVehicles,
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
      furnitureStorageState: exportFurnitureStorageData()
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
    player.angle = save.playerAngle || 0;
    player.vx = 0;
    player.vy = 0;
    player.speed = 0;
    player.isInVehicle = save.isInVehicle;
    player.currentVehicleId = save.currentVehicleId;
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

    if (save.vehicles && Array.isArray(save.vehicles)) {
      save.vehicles.forEach((sv: any) => {
        let v = world.vehicles.find(item => item.id === sv.id);
        if (!v) {
          const cfg = CAR_CONFIGS[sv.type as CarType] || CAR_CONFIGS.sedan;
          v = {
            id: sv.id,
            keyId: sv.keyId || sv.id,
            keyTier: sv.keyTier,
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
            headlightsOn: false,
            headlightMode: 'off',
            brakeLightsOn: false,
            isReversing: false,
            turnSignal: 'none',
            turnSignalTimer: 0,
            isLocked: sv.isLocked !== undefined ? sv.isLocked : true,
            ownerId: sv.ownerId || 'player',
            isParked: true,
            isPlayerControlled: false,
            targetSpeed: 0,
            currentLaneId: null,
            targetWaypointIndex: 0,
            routeWaypoints: [],
            aiState: 'parked',
            damage: sv.damage ? ensureVehicleDamage({ length: cfg.length, width: cfg.width, damage: sv.damage }) : createDefaultVehicleDamage(cfg.length, cfg.width),
            engineState: sv.engineState ? { ...sv.engineState } : createDefaultEngineState(sv.type, false, true),
            fuelSystem: sv.fuelSystem ? { ...sv.fuelSystem } : createDefaultFuelSystem(sv.type, false)
          } as Vehicle;
          world.vehicles.push(v);
        }

        if (v) {
          v.x = sv.x;
          v.y = sv.y;
          v.angle = sv.angle;
          if (sv.keyId) v.keyId = sv.keyId;
          if (sv.keyTier) v.keyTier = sv.keyTier;
          if (sv.ownerId) v.ownerId = sv.ownerId;
          if (sv.isLocked !== undefined) v.isLocked = sv.isLocked;
          
          const isPlayerCar = save.isInVehicle && save.currentVehicleId === v.id;
          if (isPlayerCar) {
            v.speed = 0;
          } else {
            v.speed = 0; // Zero speed on load
          }

          v.vx = 0;
          v.vy = 0;
          v.angularVelocity = 0;
          v.steerAngle = 0;
          if (sv.isParked !== undefined) v.isParked = sv.isParked;
          v.aiState = v.isParked ? 'parked': 'driving';
          v.targetWaypointIndex = 0;
          v.routeWaypoints = [];
          v.currentConnection = undefined;
          v.knockbackVx = 0;
          v.knockbackVy = 0;
          v.knockbackSpin = 0;
          v.stunnedTimer = 2.0; // 2 seconds stabilization / collision grace period
          v.ghostingAlpha = 1.0; // Restored vehicles are solid and fully visible

          if (sv.color) v.color = sv.color;
          if (sv.roofColor) v.roofColor = sv.roofColor;
          if (sv.hasGBO !== undefined) v.hasGBO = sv.hasGBO;

          if (sv.hasHeavySuspension !== undefined) (v as any).hasHeavySuspension = sv.hasHeavySuspension;
          if (sv.hasChiptuning !== undefined) (v as any).hasChiptuning = sv.hasChiptuning;

          if (sv.fuelSystem) v.fuelSystem = { ...sv.fuelSystem };
          if (sv.engineState) v.engineState = { ...sv.engineState };
          if (sv.damage) {
            v.damage = ensureVehicleDamage({ length: v.length, width: v.width, damage: sv.damage });
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
        const cfg = CAR_CONFIGS[veh.type] || CAR_CONFIGS.sedan;
        setActiveCarName(cfg?.name || 'Автомобиль');
        sound.startEngine();
      } else {
        player.isInVehicle = false;
        player.currentVehicleId = null;
        setIsInVehicle(false);
        setActiveCarName('');
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

    // Restore real-estate & interior states
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
          if (Array.isArray(sa.dynamicFurniture)) {
            a.dynamicFurniture = JSON.parse(JSON.stringify(sa.dynamicFurniture));
          } else {
            a.dynamicFurniture = [];
          }
          if (Array.isArray(sa.layoutFurniture) && a.layout) {
            a.layout.furniture = JSON.parse(JSON.stringify(sa.layoutFurniture));
          }
        }
      });
      clearInteriorCanvasCache();
    }

    if ((save as any).furnitureStorageState) {
      importFurnitureStorageData((save as any).furnitureStorageState);
    }

    setIsMainMenuOpen(false);
    setIsPauseMenuOpen(false);
  };

  const handleDeleteSave = (saveId: string) => {
    const updated = savesRef.current.filter(s => s.id !== saveId);
    syncSavesToStorage(updated);
  };

  const handleNewGame = (spawnId?: string) => {
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

    const spawnLoc = SPAWN_LOCATIONS.find(s => s.id === spawnId) || SPAWN_LOCATIONS[0];
    setCurrentSpawnId(spawnLoc.id);
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

    camera.x = spawnLoc.x;
    camera.y = spawnLoc.y;
    camera.targetX = spawnLoc.x;
    camera.targetY = spawnLoc.y;
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
        requiredFuel: fs.fuelType === 'diesel'? 'diesel': (fs.octaneNumber === 92 ? 'ai92': 'ai95'),
        hasGBO: ['sedan_classic', 'wagon_classic', 'taxi_yellow', 'delivery_truck', 'van_cargo_old'].includes(placement.id) ? Math.random() < 0.4 : false,
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

  // Periodic autosave based on settings.autoSaveInterval
  useEffect(() => {
    if (settings.autoSaveInterval <= 0) return;
    const interval = setInterval(() => {
      if (worldRef.current && playerRef.current && !isMainMenuOpenRef.current && !isPauseMenuOpenRef.current) {
        handleCreateSave('Автосохранение');
      }
    }, settings.autoSaveInterval * 1000);
    return () => clearInterval(interval);
  }, [settings.autoSaveInterval]);

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

      // When typing in text input or textarea, skip game controls and allow Escape to blur
      if (document.activeElement?.tagName === 'INPUT'|| document.activeElement?.tagName === 'TEXTAREA') {
        if (code === 'Escape') {
          (document.activeElement as HTMLElement).blur();
          setIsChatFocused(false);
          e.preventDefault();
        }
        return;
      }

      if (code === 'KeyR'&& activePlacementRef.current) {
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
        if (isInventoryOpen || isInspectionOpen || isConsoleOpen || isFullMapOpen || isSpawnMenuOpen || isQuickMenuOpen) {
          setIsInventoryOpen(false);
          setIsInspectionOpen(false);
          setIsConsoleOpen(false);
          setIsFullMapOpen(false);
          setIsSpawnMenuOpen(false);
          setIsQuickMenuOpen(false);
          e.preventDefault();
          return;
        }
        if (isMainMenuOpenRef.current) {
          return;
        }
        const nextPause = !isPauseMenuOpenRef.current;
        setIsPauseMenuOpen(nextPause);
        if (nextPause) {
          inputRef.current.forward = false;
          inputRef.current.backward = false;
          inputRef.current.left = false;
          inputRef.current.right = false;
          inputRef.current.handbrake = false;
          inputRef.current.sprint = false;
        }
        e.preventDefault();
        return;
      }

      if (isMainMenuOpenRef.current || isPauseMenuOpenRef.current) return;

      // Inventory Modal Toggle (I or Tab)
      if (code === 'KeyI'|| code === 'Tab') {
        setIsInventoryOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // Online Multiplayer Room Modal (O)
      if (code === 'KeyO') {
        sound.playButtonPress();
        setIsOnlineModalOpen((prev) => !prev);
        e.preventDefault();
        return;
      }

      // In-game chat focus (Enter)
      if (code === 'Enter') {
        setIsChatFocused(true);
        e.preventDefault();
        return;
      }

      // Hand selection (1 = Left hand, 2 = Right hand)
      if (code === 'Digit1'|| code === 'Numpad1') {
        const p = playerRef.current;
        if (p && !p.isInVehicle) {
          p.activeHand = 'left';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
        }
      }
      if (code === 'Digit2'|| code === 'Numpad2') {
        const p = playerRef.current;
        if (p && !p.isInVehicle) {
          p.activeHand = 'right';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
        }
      }

      if (code === 'ShiftLeft'|| code === 'ShiftRight') inputRef.current.shiftUp = true;
      if (code === 'ControlLeft'|| code === 'ControlRight') inputRef.current.shiftDown = true;
      if (code === 'KeyX') inputRef.current.transferCaseToggle = true;
      if (code === 'KeyV') {
        const p = playerRef.current;
        if (p && p.isInVehicle) {
          inputRef.current.diffLockToggle = true;
          e.preventDefault();
        }
      }
      if (code === 'KeyW'|| code === 'ArrowUp') inputRef.current.forward = true;
      if (code === 'KeyS'|| code === 'ArrowDown') inputRef.current.backward = true;
      if (code === 'KeyA'|| code === 'ArrowLeft') inputRef.current.left = true;
      if (code === 'KeyD'|| code === 'ArrowRight') inputRef.current.right = true;
      if (code === 'Comma') inputRef.current.brakeLeft = true;
      if (code === 'Period') inputRef.current.brakeRight = true;
      
      // MTZ split brakes latch toggle (B key)
      if (code === 'KeyB') {
        const p = playerRef.current;
        const world = worldRef.current;
        const currentVeh = world?.vehicles.find((v) => v.id === p?.currentVehicleId);
        if (p && p.isInVehicle && currentVeh && currentVeh.type.startsWith('tractor_')) {
          const nextLatch = currentVeh.tractorBrakeLatch === false; // toggle: if false -> true, if undefined/true -> false
          currentVeh.tractorBrakeLatch = nextLatch;
          sound.playButtonPress();
          
          const msg = nextLatch 
            ? "Тормоза МТЗ: СБЛОКИРОВАНЫ (Оба колеса тормозят вместе)"
            : "Тормоза МТЗ: РАЗДЕЛЬНЫЕ (Левый тормоз [Запятая ,], Правый тормоз [Точка .])";
          addPlayerNotification(p, msg, 'info');
          e.preventDefault();
          return;
        }
      }
      if (code === 'Space') {
        inputRef.current.handbrake = true;
        e.preventDefault();
      }
      if (code === 'ShiftLeft'|| code === 'ShiftRight') inputRef.current.sprint = true;
      if (code === 'KeyH') inputRef.current.hornH = true;

      // Turn Signals & Interaction / Consumption (Q = Left turn signal in car or Swap / Toggle Active Hand on foot, E = Interact / Use in active hand, Z = Hazard)
      if (code === 'KeyQ') {
        const p = playerRef.current;
        if (p && p.isInVehicle) {
          toggleTurnSignal('left');
        } else if (p) {
          p.activeHand = p.activeHand === 'left'? 'right': 'left';
          sound.playUseItem();
          setVitalsRefreshTick((t) => t + 1);
        }
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

      // PTO / PUMP Drive Toggle (P key) for water trucks & fire engines
      if (code === 'KeyP') {
        const p = playerRef.current;
        const world = worldRef.current;
        const currentVeh = world?.vehicles.find((v) => v.id === p?.currentVehicleId) || world?.vehicles.find((v) => v.id === p?.activeHoseState?.vehicleId);
        if (currentVeh && (currentVeh.type === 'truck_water'|| currentVeh.type === 'fire_engine')) {
          currentVeh.isPtoActive = !currentVeh.isPtoActive;
          sound.playButtonPress();

          const isEngineRunning = !!currentVeh.engineState?.engineRunning;
          let msg = '';
          if (currentVeh.isPtoActive) {
            msg = isEngineRunning 
              ? 'КОМ (Коробка отбора мощности) ВКЛ: Привод насоса активен! (Подгазуйте для максимального напора)': 'КОМ ВКЛ (Заведите двигатель для создания давления в системе)';
          } else {
            msg = 'КОМ ВЫКЛ: Насос отключен (переход на режим самотёка)';
          }

          addPlayerNotification(p, msg, currentVeh.isPtoActive ? 'info': 'warning');
          e.preventDefault();
          return;
        }
      }

      // GBO/LPG Toggle (K key)
      if (code === 'KeyK') {
        const p = playerRef.current;
        const world = worldRef.current;
        const currentVeh = world?.vehicles.find((v) => v.id === p?.currentVehicleId);
        if (p && p.isInVehicle && currentVeh?.hasGBO && currentVeh.fuelSystem) {
          const nextActive = currentVeh.fuelSystem.gboActive === false; // toggle state
          currentVeh.fuelSystem.gboActive = nextActive;
          sound.playButtonPress();
          
          const isWarm = (currentVeh.engineState?.temperature ?? 0) >= 40;
          let msg = nextActive 
            ? "ГБО ВКЛ: Переключено на пропан-бутан!": "ГБО ВЫКЛ: Переключено на резервный бензин!";
          if (nextActive && !isWarm) {
            msg += "(Режим прогрева: двигатель работает на бензине до достижения 40°C)";
          }
          addPlayerNotification(p, msg, 'info');
          e.preventDefault();
          return;
        }
      }

      // Grid Mode Toggle / Water Truck Washing Nozzles (G or N key)
      if (code === 'KeyG'|| code === 'KeyN') {
        const p = playerRef.current;
        const world = worldRef.current;
        const currentVeh = world?.vehicles.find((v) => v.id === p?.currentVehicleId);
        if (p && p.isInVehicle && currentVeh?.type === 'truck_water') {
          currentVeh.isWashingNozzlesActive = !currentVeh.isWashingNozzlesActive;
          sound.playButtonPress();
          const isPto = !!currentVeh.isPtoActive;
          const isEng = !!currentVeh.engineState?.engineRunning;
          let msg = `Поливомоечные сопла: ${currentVeh.isWashingNozzlesActive ? 'ВКЛЮЧЕНЫ': 'ВЫКЛЮЧЕНЫ'}`;
          if (currentVeh.isWashingNozzlesActive && (!isPto || !isEng)) {
            msg += '(Внимание: включите КОМ [P] и заведите двигатель для высокого давления)';
          }
          addPlayerNotification(
            p,
            msg,
            currentVeh.isWashingNozzlesActive ? 'info': 'warning');
          e.preventDefault();
          return;
        }

        if (code === 'KeyG') {
          const cam = cameraRef.current;
          cam.gridMode = !cam.gridMode;
          setIsGridMode(!!cam.gridMode);
          addPlayerNotification(playerRef.current, `Режим сетки (Grid Mode) ${cam.gridMode ? 'ВКЛ': 'ВЫКЛ'}`, 'info');
        }
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
      if (code === 'Backquote'|| code === 'F2') {
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
        const target = activeInteractionRef.current;
        if (target && target.primaryKey === 'R') {
          handleExecuteActiveInteraction(target);
        } else if (playerRef.current && worldRef.current) {
          const mouseWorld = getMouseWorldPos(inputRef.current.mouseX || 0, inputRef.current.mouseY || 0);
          const rTarget = findActiveInteraction(playerRef.current, worldRef.current, mouseWorld, 'R');
          if (rTarget) {
            handleExecuteActiveInteraction(rTarget);
          } else {
            handleResetVehicle();
          }
        } else {
          handleResetVehicle();
        }
      }
      if (code === 'KeyL') {
        toggleHeadlights();
      }
      if (code === 'KeyU') {
        handleToggleFrontFogLights();
      }
      if (code === 'KeyY') {
        handleToggleRearFogLights();
      }
      if (code === 'KeyN') {
        handleToggleRoadTrainLights();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'ShiftLeft'|| code === 'ShiftRight') inputRef.current.shiftUp = false;
      if (code === 'ControlLeft'|| code === 'ControlRight') inputRef.current.shiftDown = false;
      if (code === 'KeyX') inputRef.current.transferCaseToggle = false;
      if (code === 'KeyV') inputRef.current.diffLockToggle = false;
      if (code === 'KeyW'|| code === 'ArrowUp') inputRef.current.forward = false;
      if (code === 'KeyS'|| code === 'ArrowDown') inputRef.current.backward = false;
      if (code === 'KeyA'|| code === 'ArrowLeft') inputRef.current.left = false;
      if (code === 'KeyD'|| code === 'ArrowRight') inputRef.current.right = false;
      if (code === 'Comma') inputRef.current.brakeLeft = false;
      if (code === 'Period') inputRef.current.brakeRight = false;
      if (code === 'Space') inputRef.current.handbrake = false;
      if (code === 'ShiftLeft'|| code === 'ShiftRight') inputRef.current.sprint = false;
      if (code === 'KeyH') inputRef.current.hornH = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      inputRef.current.mouseX = e.clientX;
      inputRef.current.mouseY = e.clientY;

      // Update pedestrian aim angle if walking (accounting for camera rotation)
      // Only update when mouse is moving directly over the world canvas, not UI buttons!
      const player = playerRef.current;
      if (!player.isInVehicle && canvas && e.target === canvas) {
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
      } else if (e.button === 0 && e.target === canvas) {
        const target = activeInteractionRef.current;
        if (target && target.type !== 'hand_item'&& target.type !== 'exit_vehicle') {
          handleExecuteActiveInteraction();
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        inputRef.current.isMouseDown = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (activePlacementRef.current) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0 && canvas && e.target === canvas) {
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

    const handlePhoneModalEvent = (e: Event) => {
      const customEv = e as CustomEvent<{ item?: InventoryItem }>;
      if (customEv.detail?.item) {
        setActivePhoneItem(customEv.detail.item);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('open_phone_modal', handlePhoneModalEvent);

    cleanupListeners = () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
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

    const gameLoop = (now: number) => {
      if (isMainMenuOpenRef.current || isPauseMenuOpenRef.current) {
        animationFrameId = requestAnimationFrame(gameLoop);
        return;
      }

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

        // 0. Update Online Multiplayer Network State & Synchronize Entities
        onlineManager.update(dt, world);
        onlineSyncTimerRef.current += dt;
        if (onlineSyncTimerRef.current >= 0.04) {
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
        const tAiStart = performance.now();
        updateTrafficLights(world.intersections, dt);
        TrainSystem.update(world, dt, player.x, player.y, player);
        RailwaySignalingSystem.update(world, dt);
        updateAITraffic(world, dt, vehGrid, pedGrid, { x: player.x, y: player.y }, player, spatialGridPropsRef.current);
        const tAiEnd = performance.now();

        // 4. Update Pedestrians (using spatial grids and player position)
        const tPedStart = performance.now();
        updatePedestrians(world, dt, vehGrid, pedGrid, bldGrid, { x: player.x, y: player.y }, spatialGridPropsRef.current, player);
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
            updatePlayerPedestrianPhysics(player, effectiveInput, playerNearbyBuildings, dt, camera.angle, world.width, world.height, world, vehGrid);
            if (!player.needsHospitalEvacuation) {
              camera.targetX = player.x;
              camera.targetY = player.y;
              camera.targetAngle = 0;
              camera.targetZoom = 1.3 * userZoomFactorRef.current;
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
            if (item && item.usable && (item.itemId === 'extinguisher'|| item.itemId === 'zippo_lighter'|| item.itemId === 'fuel_canister')) {
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

              // Check if player is standing in ANY elevator zone
              const elevators = (layout.elevators && layout.elevators.length > 0) ? layout.elevators : (layout.elevatorZone ? [layout.elevatorZone] : []);
              const inElevator = elevators.some(el =>
                el &&
                relX >= el.x && relX <= el.x + el.width &&
                relY >= el.y && relY <= el.y + el.height
              );

              // Check if player is standing in ANY stairs zone
              const stairsList = (layout.stairs && layout.stairs.length > 0) ? layout.stairs : (layout.stairsZone ? [layout.stairsZone] : []);
              const inStairs = stairsList.some(st =>
                st &&
                relX >= st.x && relX <= st.x + st.width &&
                relY >= st.y && relY <= st.y + st.height
              );

              // Check if player is standing in ANY exit zone or near doors on floor 0
              const exits = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
              const inExit = exits.some(ex =>
                ex &&
                relX >= ex.x - 35 && relX <= ex.x + ex.width + 35 &&
                relY >= ex.y - 35 && relY <= ex.y + ex.height + 35
              ) || (currentFloor === 0 && (relY <= 50 || relY >= bld.height - 50 || relX <= 50 || relX >= bld.width - 50));

              const maxFloors = getBuildingFloorsCount(bld);
              const canGoUpOrDown = inElevator || inStairs;

              if (canGoUpOrDown) {
                setActiveElevatorMenu(prev => {
                  if (!prev || prev.bldId !== bld.id || prev.currentFloor !== currentFloor || prev.type !== (inElevator ? 'elevator': 'stairs')) {
                    return {
                      bldId: bld.id,
                      bldName: (bld.type || 'BUILDING').toUpperCase().replace('_', ''),
                      currentFloor: currentFloor,
                      maxFloors: maxFloors,
                      type: inElevator ? 'elevator': 'stairs'};
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
              let shopName = currentRoomName || bld.nameRu || 'Магазин';

              if (bld.shopBrand === 'pharmacy_36_6'|| currentRoomName.includes('Аптека') || currentRoomName.includes('Панацея') || currentRoomName.includes('Медпункт') || bld.type === 'hospital') {
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
                shopFound = {
                  id: `room_shop_${bld.id}_${currentFloor}_${Math.floor(relX)}_${Math.floor(relY)}`,
                  nameRu: shopName,
                  type: shopType,
                  x: bld.x + relX,
                  y: bld.y + relY,
                  icon: shopIcon,
                  badgeColor: badgeColor,
                  description: `Отдел: ${shopName}. Нажмите [E] для открытия каталога.`};
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
        const sleepMargin = Math.hypot(window.innerWidth, window.innerHeight) / (2 * Math.max(0.4, camera.zoom)) + 350;
        let playerCar: Vehicle | null = null;
        for (const veh of world.vehicles) {
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

          const distToPlayer = Math.hypot(veh.x - player.x, veh.y - player.y);
          const isMoving = Math.abs(veh.speed) > 1 || Math.abs(veh.vx || 0) > 1 || Math.abs(veh.vy || 0) > 1;

          // Put stationary/parked non-player vehicles far outside the camera viewport to sleep
          if (!veh.isPlayerControlled && !(veh as any).isRemoteControlled && !isMoving && distToPlayer > sleepMargin) {
            continue;
          }

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

        // Apartment Bed Sleeping & Night Awakening State Machine
        if (bedSleepStateRef.current && bedSleepStateRef.current.isActive) {
          const nextSleepState = updateBedSleepCycle(
            bedSleepStateRef.current,
            player,
            dt,
            timeHourRef.current,
            (newHour) => {
              timeHourRef.current = newHour;
              setTimeHour(newHour);
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

        // 6. Throttled HUD State Updates (Run at ~12.5 Hz to prevent React re-render lag)
        hudUpdateTimerRef.current += dt;
        if (hudUpdateTimerRef.current >= 0.08) {
          hudUpdateTimerRef.current = 0;
          setVitalsRefreshTick((t) => t + 1);

          if (playerCar) {
            const currentSpeedKmh = Math.round(Math.abs(playerCar.speed) * PX_S_TO_SPEED_KMH);
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
                setGear(eng.currentGear === -1 ? 'R': eng.currentGear === 0 ? 'N': String(eng.currentGear));
              }
            } else {
              setGear('D');
            }
          }

          // Determine current street name
          const currentStreet = findStreetNameAtPosition(world, player.x, player.y);
          setStreetName(currentStreet);

          // Physical Context Interaction System (cone of view + reach + mouse priority)
          const mouseWorld = getMouseWorldPos(input.mouseX || 0, input.mouseY || 0);
          const currentInteraction = findActiveInteraction(player, world, mouseWorld);
          activeInteractionRef.current = currentInteraction;
          const interactionKey = currentInteraction ? `${currentInteraction.type}_${currentInteraction.primaryKey}_${currentInteraction.actionTitle}`: '';
          if (interactionKey !== prevInteractionKeyRef.current) {
            prevInteractionKeyRef.current = interactionKey;
            setActiveInteraction(currentInteraction);
          }
          if (currentInteraction?.type === 'enter_vehicle') {
            setNearbyCarPrompt(currentInteraction.actionTitle);
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
        world.timeHour = timeHourRef.current;
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

              addPlayerNotification(player, `Вы доставлены в палату интенсивной терапии Городской Больницы №1!`, 'heal');
            }
          }
        }

        // 8.5. Smooth Camera Lerp
        camera.x += (camera.targetX - camera.x) * 6 * dt;
        camera.y += (camera.targetY - camera.y) * 6 * dt;
        camera.zoom += (camera.targetZoom - camera.zoom) * 4 * dt;
        if (camera.shakeTimer > 0) camera.shakeTimer = Math.max(0, camera.shakeTimer - dt);

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

        // 10. Render Scene with pre-culled viewport entities (skipped when FullScreenMap covers entire screen)
        const tRenderStart = performance.now();
        if (!isFullMapOpenRef.current) {
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
            currentMouseWorldPos,
            onlineManager.getRemotePlayersArray(),
            onlineManager.getSpeechBubbles(),
            activeInteractionRef.current
          );
        }
        const tRenderEnd = performance.now();

        // Update DOM overlay position for ContextInteractionHUD with high performance
        const hudEl = document.getElementById('context-interaction-hud-overlay');
        if (hudEl) {
          const target = activeInteractionRef.current;
          if (target && target.type !== 'hand_item' && target.type !== 'exit_vehicle') {
            const screenPos = worldToScreen(target.x, target.y);
            if (screenPos) {
              hudEl.style.display = 'flex';
              hudEl.style.transform = `translate3d(${screenPos.x}px, ${screenPos.y}px, 0)`;
              hudEl.style.opacity = '1';
            } else {
              hudEl.style.display = 'none';
              hudEl.style.opacity = '0';
            }
          } else {
            hudEl.style.display = 'none';
            hudEl.style.opacity = '0';
          }
        }

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
      const { apartmentId } = e.detail || {};
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

    window.addEventListener('apartment_key_activated' as any, handleKeyActivated as any);
    window.addEventListener('open_property_document_modal' as any, handleOpenPropDoc as any);

    return () => {
      window.removeEventListener('apartment_key_activated' as any, handleKeyActivated as any);
      window.removeEventListener('open_property_document_modal' as any, handleOpenPropDoc as any);
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
          text: `В замке зажигания пусто! Возьмите ${keyName} в руку и нажмите [E] или используйте из инвентаря.`,
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
        sound.playButtonPress();
        if (!player.notifications) player.notifications = [];
        player.notifications.push({
          id: 'eng_inhibitor_'+ Date.now(),
          text: 'Блокиратор стартера (АКПП)! Запуск разрешён только в режиме P (Паркинг) или N (Нейтраль).',
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

        // Physical impulse from starter motor cranking directly against wheels and transmission
        const currentSpeedInJerkDir = veh.speed * jerkDir;
        const maxStarterLurchSpeed = 12.0; // ~4.3 km/h
        if (currentSpeedInJerkDir < maxStarterLurchSpeed) {
          const newSpeedAlongDir = Math.min(maxStarterLurchSpeed, currentSpeedInJerkDir + 6.5);
          veh.speed = newSpeedAlongDir * jerkDir;
        } else {
          // If already moving faster than starter lurch speed, mechanical drag slows down the car
          veh.speed *= 0.65;
        }
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
  const handleEnterExitVehicle = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world) return;

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
        
        // Note: engine running state and current gear are preserved on the vehicle object
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
        if (closestVeh.type.startsWith('trailer_') || closestVeh.isTrailer) {
          sound.playAlert();
          addPlayerNotification(player, 'Прицеп не имеет двигателя или кабины! Подцепите его к трактору или фаркопу машины.', 'warning');
          return;
        }

        if (closestVeh.isLocked) {
          sound.playAlert();
          addPlayerNotification(player, 'Двери автомобиля заперты! Используйте ключ от машины [E] или отмычку.', 'warning');
          return;
        }

        closestVeh.steerAngle = typeof closestVeh.steerAngle === 'number'&& Number.isFinite(closestVeh.steerAngle) ? closestVeh.steerAngle : 0;
        closestVeh.angle = typeof closestVeh.angle === 'number'&& Number.isFinite(closestVeh.angle) ? closestVeh.angle : 0;
        closestVeh.speed = typeof closestVeh.speed === 'number'&& Number.isFinite(closestVeh.speed) ? closestVeh.speed : 0;
        closestVeh.vx = typeof closestVeh.vx === 'number'&& Number.isFinite(closestVeh.vx) ? closestVeh.vx : 0;
        closestVeh.vy = typeof closestVeh.vy === 'number'&& Number.isFinite(closestVeh.vy) ? closestVeh.vy : 0;

        if (!closestVeh.engineState) {
          closestVeh.engineState = createDefaultEngineState(closestVeh.type, false, true);
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

          if (eng.transmissionType === 'AUTO') {
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
    if (!p || !world) return;

    switch (target.type) {
      case 'enter_vehicle':
      case 'exit_vehicle':
        handleEnterExitVehicle();
        break;

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
            } else if (exitZone.x >= bld.width - 20) {
              enterX = exitZone.x - 12;
            } else if (exitZone.y <= 10) {
              enterY = exitZone.y + exitZone.height + 12;
            } else {
              enterY = exitZone.y - 12;
            }
            let newPX = bld.x + enterX;
            let newPY = bld.y + enterY;
            if (!Number.isFinite(newPX)) newPX = bld.x + bld.width / 2;
            if (!Number.isFinite(newPY)) newPY = bld.y + bld.height / 2;
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
        setActiveGasPump(pump);
        setIsFuelNozzleModalOpen(true);
        sound.playUseItem();
        break;
      }

      case 'pump_return_nozzle': {
        const pump = target.data as GasPumpDispenser;
        if (pump) {
          returnNozzleToPump(p, pump);
          addPlayerNotification(p, `Топливный пистолет возвращен на колонку №${pump.pumpNumber}.`, 'info');
          sound.playUseItem();
          setVitalsRefreshTick(t => t + 1);
        }
        break;
      }

      case 'gas_cashier': {
        setShopType('gas_station_shop');
        setShopTitle('АЗС «НЕФТЬМАГИСТРАЛЬ» 24/7');
        setIsShopOpen(true);
        sound.playUseItem();
        break;
      }

      case 'water_hose_take': {
        const veh = target.data as Vehicle;
        takeWaterHose(p, veh, world);
        const sourceName = veh.type === 'truck_water'? 'насосной станции водовоза': 'крана бочки-цистерны';
        addPlayerNotification(p, `Шланг размотан с ${sourceName}! Зажмите ЛКМ или E для подачи воды.`, 'info');
        sound.playUseItem();
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'water_hose_stow': {
        stowWaterHose(p, world);
        addPlayerNotification(p, 'Поливочный шланг смотан и закреплен на штатное место.', 'info');
        sound.playUseItem();
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'tow_rope_detach': {
        const data = target.data;
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
        const { bld } = target.data;
        setActiveElevatorMenu({
          bldId: bld.id,
          bldName: bld.nameRu || 'Здание',
          currentFloor: p.currentFloor || 0,
          totalFloors: bld.floors || 1
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
        let resolvedTitle = bld.nameRu || 'Магазин';
        setShopType(resolvedType);
        setShopTitle(resolvedTitle);
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
        const activeHandItem = p.inventory?.[p.activeHand === 'left'? p.leftHandSlotIndex ?? -1 : p.rightHandSlotIndex ?? -1];
        if (activeHandItem && (activeHandItem.category === 'drink'|| activeHandItem.id.includes('bottle') || activeHandItem.id.includes('can') || activeHandItem.id.includes('cup'))) {
          const handSlot = p.activeHand === 'left'? p.leftHandSlotIndex : p.rightHandSlotIndex;
          if (handSlot !== null && handSlot !== undefined && p.inventory[handSlot]) {
            p.inventory[handSlot] = null as any;
            addPlayerCash(p, 5);
            addPlayerNotification(p, `Эко-фандомат: тара сдана на переработку (+$5)`, 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
            return;
          }
        }
        setIsInventoryOpen(true);
        addPlayerNotification(p, 'Выберите пустую тару в инвентаре для сдачи в эко-фандомат', 'info');
        sound.playUseItem();
        break;
      }

      case 'trash_throw': {
        const activeHandItem = p.inventory?.[p.activeHand === 'left'? p.leftHandSlotIndex ?? -1 : p.rightHandSlotIndex ?? -1];
        if (activeHandItem && (activeHandItem.category === 'trash'|| activeHandItem.id.includes('trash') || activeHandItem.id.includes('wrapper') || activeHandItem.id.includes('empty'))) {
          const handSlot = p.activeHand === 'left'? p.leftHandSlotIndex : p.rightHandSlotIndex;
          if (handSlot !== null && handSlot !== undefined && p.inventory[handSlot]) {
            p.inventory[handSlot] = null as any;
            addPlayerNotification(p, 'Мусор утилизирован в урну.', 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
            return;
          }
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
        const res = toggleApartmentLock(p, apt);
        sound.playUseItem();
        addPlayerNotification(p, res.message, res.success ? 'heal' : 'warning');
        setVitalsRefreshTick(t => t + 1);
        break;
      }

      case 'apartment_door_enter': {
        const { apt } = target.data || {};
        if (!apt) break;
        if (apt.isLocked) {
          addPlayerNotification(p, `Дверь заперта! Требуется стальной ключ`, 'warning');
          sound.playUseItem();
          return;
        }
        setFadeActive(true);
        sound.playCarDoor();
        setTimeout(() => {
          const bld = world.buildings?.find(b => b.id === apt.buildingId);
          const baseBldX = bld ? bld.x : 0;
          const baseBldY = bld ? bld.y : 0;
          const spawnX = baseBldX + (apt.spawnX ?? 25);
          const spawnY = baseBldY + (apt.spawnY ?? 75);
          
          p.isInsideBuilding = true;
          p.isInsideApartment = true;
          p.insideApartmentId = apt.id;
          p.insideBuildingId = apt.buildingId;
          p.currentFloor = apt.floor;
          p.x = spawnX;
          p.y = spawnY;
          cameraRef.current.x = spawnX;
          cameraRef.current.y = spawnY;
          cameraRef.current.targetX = spawnX;
          cameraRef.current.targetY = spawnY;
          addPlayerNotification(p, `Вы вошли в коттедж (${apt.address})`, 'info');
          setTimeout(() => {
            setFadeActive(false);
          }, 150);
        }, 200);
        break;
      }

      case 'apartment_exit': {
        const apt = getApartmentById(p.insideApartmentId || '');
        setFadeActive(true);
        sound.playCarDoor();
        setTimeout(() => {
          p.isInsideApartment = false;
          p.insideApartmentId = null;
          if (apt) {
            const bld = world.buildings?.find(b => b.id === apt.buildingId);
            const exitX = apt.entranceWorldX ?? (bld ? bld.x + bld.width / 2 : p.x);
            const exitY = apt.entranceWorldY ?? (bld ? bld.y + bld.height + 16 : p.y + 16);
            p.x = exitX;
            p.y = exitY;
            
            // If it was a suburban cottage, we also exit building mode entirely
            if (apt.buildingType === 'suburban') {
              p.isInsideBuilding = false;
              p.insideBuildingId = null;
            }
          }
          cameraRef.current.x = p.x;
          cameraRef.current.y = p.y;
          cameraRef.current.targetX = p.x;
          cameraRef.current.targetY = p.y;
          setTimeout(() => {
            setFadeActive(false);
          }, 150);
        }, 200);
        break;
      }

      case 'furniture_storage': {
        const { bld, currentFloor, furnitureIndex, furnitureType, aptId, customTitle } = target.data || {};
        if (bld && furnitureType) {
          setFurnitureStorageData({
            buildingId: bld.id,
            floor: currentFloor ?? 0,
            furnitureIndex: furnitureIndex ?? 0,
            furnitureType,
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

              // Evacuate any stored items from furniture storage container
              const storageId = buildFurnitureStorageId(
                target.data?.bld?.id || apt.buildingId, 
                target.data?.currentFloor ?? apt.floor ?? 0, 
                furnitureIndex, 
                apt.id
              );
              const storage = getExistingFurnitureStorage(storageId);
              if (storage && storage.items && storage.items.length > 0) {
                for (const storedItem of storage.items) {
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
                storage.items = [];
              }
              deleteFurnitureStorage(storageId);

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
        handleInteractE();
        break;
      }
    }
  };

  // --- INTERACT HANDLER (ENTER / EXIT VEHICLE OR BUILDING / PICKUP / ACTION) ---
  const handleInteract = () => {
    const world = worldRef.current;
    const player = playerRef.current;
    if (!world || !player) return;

    // Check if there is an active contextual interaction with primaryKey 'F'
    const target = activeInteractionRef.current;
    if (target && target.primaryKey === 'F') {
      handleExecuteActiveInteraction(target);
      return;
    }

    // Query candidate specifically for key 'F'
    const mouseWorld = getMouseWorldPos(inputRef.current.mouseX || 0, inputRef.current.mouseY || 0);
    const fTarget = findActiveInteraction(player, world, mouseWorld, 'F');
    if (fTarget) {
      handleExecuteActiveInteraction(fTarget);
      return;
    }
  };

  const handleInteractE = () => {
    const p = playerRef.current;
    const world = worldRef.current;
    if (!p || !world) return;

    if (p.isInVehicle) {
      setIsRadialMenuOpen(prev => !prev);
      return;
    }

    // Check if currently active target has primaryKey 'E'
    const target = activeInteractionRef.current;
    if (target && target.primaryKey === 'E') {
      handleExecuteActiveInteraction(target);
      return;
    }

    // Query candidate specifically for key 'E' (e.g. storage, bed, cashier, in-hand item)
    const mouseWorld = getMouseWorldPos(inputRef.current.mouseX || 0, inputRef.current.mouseY || 0);
    const eTarget = findActiveInteraction(p, world, mouseWorld, 'E');
    if (eTarget) {
      handleExecuteActiveInteraction(eTarget);
      return;
    }

    // 0. HIGH-DETAIL GAS STATION MECHANICS (Nozzle pickup, Vehicle insert, Cashier payment)
    if (world) {
      // 0a. Player holding a fuel nozzle
      if (p.heldFuelNozzle) {
        const nearbyVeh = getNearbyVehicleForFueling(p.x, p.y, world);
        const pump = world.gasPumps?.find(gp => gp.id === p.heldFuelNozzle?.pumpId);
        if (nearbyVeh && pump) {
          const nozzleFuelType = p.heldFuelNozzle.fuelType;
          const success = insertNozzleIntoVehicle(p, nearbyVeh, pump, world);
          if (success) {
            const grade = FUEL_GRADES[nozzleFuelType];
            const vehName = CAR_CONFIGS[nearbyVeh.type]?.name || nearbyVeh.type;
            addPlayerNotification(p, `Топливный пистолет [${grade?.nameRu || ''}] вставлен в бак (${vehName}). Пройдите в кассу АЗС для оплаты.`, 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
            return;
          }
        }

        if (pump) {
          const nearPump = getNearbyGasPump(p.x, p.y, world);
          if (nearPump && nearPump.id === pump.id) {
            returnNozzleToPump(p, pump);
            addPlayerNotification(p, `Топливный пистолет возвращен на колонку №${pump.pumpNumber}.`, 'info');
            sound.playUseItem();
            setVitalsRefreshTick(t => t + 1);
            return;
          }
        }
      }

      // 0b. Near a vehicle that has an inserted nozzle
      if (world.vehicles) {
        for (const v of world.vehicles) {
          if (v.fuelingState?.nozzleInTank) {
            const capPos = getVehicleFuelCapPosition(v);
            const d = Math.hypot(capPos.x - p.x, capPos.y - p.y);
            if (d < 75) {
              const pump = world.gasPumps?.find(gp => gp.id === v.fuelingState?.pumpId);
              if (pump) {
                if (pump.isPumping) {
                  addPlayerNotification(p, 'Идет процесс подачи топлива! Дождитесь окончания заправки.', 'warning');
                  return;
                }
                removeNozzleFromVehicle(p, v, pump, world);
                addPlayerNotification(p, `Топливный пистолет извлечен из бака. Повесьте его обратно на колонку №${pump.pumpNumber}.`, 'info');
                sound.playUseItem();
                setVitalsRefreshTick(t => t + 1);
                return;
              }
            }
          }
        }
      }

      // 0c. Near a Gas Pump Dispenser
      const nearPump = getNearbyGasPump(p.x, p.y, world);
      if (nearPump) {
        if (nearPump.isPumping) {
          addPlayerNotification(p, `Колонка №${nearPump.pumpNumber} в процессе подачи топлива.`, 'info');
          return;
        }
        setActiveGasPump(nearPump);
        setIsFuelNozzleModalOpen(true);
        sound.playUseItem();
        return;
      }

      // 0d. Near Gas Station Cashier Terminal / Counter
      if (isPlayerNearGasStationCashier(p, world)) {
        setShopType('gas_station_shop');
        setShopTitle('АЗС «НЕФТЬМАГИСТРАЛЬ» 24/7');
        setIsShopOpen(true);
        sound.playUseItem();
        return;
      }

      // 0e. Near Front Hood of a Vehicle
      if (world.vehicles) {
        for (const v of world.vehicles) {
          const cfg = CAR_CONFIGS[v.type] || CAR_CONFIGS.sedan;
          const frontX = v.x + Math.cos(v.angle) * (cfg.length * 0.42);
          const frontY = v.y + Math.sin(v.angle) * (cfg.length * 0.42);
          const distToFront = Math.hypot(p.x - frontX, p.y - frontY);

          if (distToFront < 55 && !isTrailerVehicle(v)) {
            v.engineState.hoodOpen = true;
            setEngineBayVehicle(v);
            setIsEngineBayOpen(true);
            sound.playUseItem();
            addPlayerNotification(p, `Открыт капот (${cfg.name})`, 'info');
            setVitalsRefreshTick(t => t + 1);
            return;
          }
        }
      }
    }

    const activeHand = p.activeHand || 'right';
    let currentHand = activeHand;
    let handItem = currentHand === 'left'? p.leftHandItem : p.rightHandItem;

    // If active hand is empty, check if other hand holds something
    if (!handItem) {
      const otherHand = activeHand === 'left'? 'right': 'left';
      const otherHandItem = otherHand === 'left'? p.leftHandItem : p.rightHandItem;
      if (otherHandItem) {
        currentHand = otherHand;
        handItem = otherHandItem;
        p.activeHand = otherHand;
      }
    }

    // 1. PRIMARY: If player has an item in hand, use or open it!
    if (handItem) {
      if (handItem.isContainer || handItem.itemId === 'wallet'|| handItem.itemId === 'plastic_bag') {
        setIsInventoryOpen(true);
        sound.playUseItem();
        addPlayerNotification(p, `Открыт контейнер: ${handItem.nameRu}`, 'info');
        return;
      }

      const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
      if ((handItem.category === 'med'&& TOPICAL_ITEMS.includes(handItem.itemId)) || handItem.requiresLimbSelection) {
        setTreatmentModalItem({ index: -1, item: handItem });
        sound.playUseItem();
        return;
      }

      if (handItem.usable) {
        useHandItemOnPlayer(p, currentHand, world || undefined);
        sound.resume();
        setVitalsRefreshTick(t => t + 1);
        return;
      }

      addPlayerNotification(p, `Предмет "${handItem.nameRu}"в руке нельзя активировать напрямую`, 'info');
      return;
    }

    // 2. SECONDARY: Pick up nearby ground items if any within reaching distance (~65px)
    if (world && world.groundItems && world.groundItems.length > 0) {
      let closestGI: GroundItem | null = null;
      let minDist = 65;
      for (const gi of world.groundItems) {
        const d = Math.hypot(p.x - gi.x, p.y - gi.y);
        if (d < minDist) {
          minDist = d;
          closestGI = gi;
        }
      }
      if (closestGI) {
        pickupGroundItem(p, world, closestGI);
        setVitalsRefreshTick(t => t + 1);
        return;
      }
    }

    // 3. Pick up nearby litter
    if (pickupNearbyLitter(p, world)) {
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    // 4. Shop Interaction (when near a shop zone or inside a store)
    let hasStandaloneShop = false;
    let resolvedType: CityShop['type'] = 'supermarket';
    let resolvedTitle = 'Супермаркет "Регуляр 24/7"';

    if (p.isInsideBuilding && p.insideBuildingId) {
      const bld = world?.buildings.find(b => b.id === p.insideBuildingId);
      if (bld) {
        if (bld.shopBrand === 'pharmacy_36_6'|| bld.type === 'hospital') {
          resolvedType = 'pharmacy';
          resolvedTitle = bld.nameRu || 'Аптека "Панацея"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'cofix_bakery') {
          resolvedType = 'cafe';
          resolvedTitle = bld.nameRu || 'Кафе & Пекарня "Урбан & Бейкери"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'bean_bistro') {
          resolvedType = 'cafe';
          resolvedTitle = bld.nameRu || 'Кафе & Кофейня "Bean & Bistro"';
          hasStandaloneShop = true;
        } else if (bld.type === 'car_dealership'|| bld.shopBrand === 'car_dealership') {
          setIsDealershipOpen(true);
          sound.playUseItem();
          return;
        } else if (bld.shopBrand === 'pitstop_service') {
          resolvedType = 'auto_shop';
          resolvedTitle = bld.nameRu || 'Автомастерская & Сервис "PIT-STOP"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'splav_gear') {
          resolvedType = 'gear_shop';
          resolvedTitle = bld.nameRu || 'Магазин "Охота & Туризм Тракт"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'dodo_pizza') {
          resolvedType = 'pizzeria';
          resolvedTitle = bld.nameRu || 'Пиццерия "Пицца-Империя"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'perekrestok') {
          resolvedType = 'supermarket';
          resolvedTitle = bld.nameRu || 'Супермаркет "Азимут 24/7"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'pyaterochka') {
          resolvedType = 'supermarket';
          resolvedTitle = bld.nameRu || 'Супермаркет "Регуляр 24/7"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'vkusno_tochka') {
          resolvedType = 'fast_food';
          resolvedTitle = bld.nameRu || 'Ресторан "Бургер-Клаб"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'mvideo') {
          resolvedType = 'electronics';
          resolvedTitle = bld.nameRu || 'Гипермаркет электроники "Электро-Маркет"';
          hasStandaloneShop = true;
        } else if (bld.shopBrand === 'sportmaster') {
          resolvedType = 'sports_shop';
          resolvedTitle = bld.nameRu || 'Спортивный гипермаркет "Спорт-Олимп"';
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
      return;
    }

    // 5. Pocket Consumables: Use selected slot or first usable item in pockets
    const currentSlot = selectedHotbarIndexRef.current ?? 0;
    const selectedPocketItem = p?.inventory?.[currentSlot];

    if (selectedPocketItem && selectedPocketItem.usable) {
      const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
      if (selectedPocketItem.category === 'med'&& TOPICAL_ITEMS.includes(selectedPocketItem.itemId)) {
        setTreatmentModalItem({ index: currentSlot, item: selectedPocketItem });
        return;
      }
      useItemOnPlayer(p, currentSlot, world || undefined);
      sound.resume();
      setVitalsRefreshTick(t => t + 1);
      return;
    }

    // Check if wallet or container is in inventory
    if (p.inventory && p.inventory.length > 0) {
      const containerItem = p.inventory.find(it => it && (it.isContainer || it.itemId === 'wallet'|| it.itemId === 'plastic_bag'));
      if (containerItem) {
        setIsInventoryOpen(true);
        sound.playUseItem();
        return;
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
        const layout = getBuildingLayout(bld, floor);
        const relX = player.x - bld.x;
        const relY = player.y - bld.y;

        // Find elevator zone in the target floor matching player's current section or position
        const elevators = (layout.elevators && layout.elevators.length > 0) ? layout.elevators : (layout.elevatorZone ? [layout.elevatorZone] : []);
        let bestElevator = elevators[0];
        if (elevators.length > 0) {
          let minElDist = Infinity;
          for (const el of elevators) {
            if (!el) continue;
            const d = Math.hypot(relX - (el.x + el.width / 2), relY - (el.y + el.height / 2));
            if (d < minElDist) {
              minElDist = d;
              bestElevator = el;
            }
          }
        }

        const elX = bestElevator?.x ?? (bld.width / 2 - 9);
        const elY = bestElevator?.y ?? (bld.height / 2 - 9);
        const elW = bestElevator?.width ?? 18;
        const elH = bestElevator?.height ?? 18;
        const destX = bld.x + elX + elW / 2;
        const destY = bld.y + (elY < bld.height / 2 ? elY + elH + 12 : elY - 12);
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

  const staticMinimapCanvasRef = useRef<HTMLCanvasElement | null>(null);

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
      const scaleX = w / (world.width || 52000);
      const scaleY = h / (world.height || 30000);
      const scale = Math.min(scaleX, scaleY);

      // Pre-render static background into offscreen canvas at display resolution
      if (!staticMinimapCanvasRef.current || staticMinimapCanvasRef.current.width !== w || staticMinimapCanvasRef.current.height !== h) {
        if (staticMinimapCanvasRef.current) {
          staticMinimapCanvasRef.current.width = 0;
          staticMinimapCanvasRef.current.height = 0;
        }
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const oCtx = offscreen.getContext('2d');
        if (oCtx) {
          oCtx.save();
          oCtx.scale(scale, scale);

          // Terrain / Parks
          oCtx.fillStyle = '#064e3b30';
          oCtx.fillRect(100, 100, 2600, 2600); // Forest
          oCtx.fillRect(3700, 2100, 1400, 1400); // Central Park

          // Buildings
          oCtx.fillStyle = '#1e293b70';
          for (const bld of world.buildings) {
            if (bld.type !== 'park_monument') {
              oCtx.fillRect(bld.x, bld.y, bld.width, bld.height);
            }
          }

          // Roads
          for (const road of world.roads) {
            if (road.isRoundabout) continue;
            const roadColor = road.isDirt ? '#855836' : (road.isGravel ? '#78716c' : '#383b42');
            if (road.curvePoints && road.curvePoints.length > 1) {
              oCtx.save();
              oCtx.strokeStyle = roadColor;
              oCtx.lineWidth = road.width;
              oCtx.lineCap = 'round';
              oCtx.lineJoin = 'round';
              oCtx.beginPath();
              oCtx.moveTo(road.curvePoints[0].x, road.curvePoints[0].y);
              for (let i = 1; i < road.curvePoints.length; i++) {
                oCtx.lineTo(road.curvePoints[i].x, road.curvePoints[i].y);
              }
              oCtx.stroke();
              oCtx.restore();
              continue;
            }
            const dx = road.x2 - road.x1;
            const dy = road.y2 - road.y1;
            const len = Math.hypot(dx, dy);
            if (len < 0.5) continue;
            oCtx.save();
            oCtx.fillStyle = roadColor;
            oCtx.translate(road.x1, road.y1);
            oCtx.rotate(Math.atan2(dy, dx));
            oCtx.fillRect(0, -road.width / 2, len, road.width);
            oCtx.restore();
          }
          if (world.roundabouts) {
            for (const rb of world.roundabouts) {
              oCtx.fillStyle = '#32343a';
              oCtx.beginPath();
              oCtx.arc(rb.x, rb.y, rb.radius, 0, Math.PI * 2);
              oCtx.fill();
              oCtx.fillStyle = '#3a3b3f';
              oCtx.beginPath();
              oCtx.arc(rb.x, rb.y, rb.innerRadius, 0, Math.PI * 2);
              oCtx.fill();
            }
          }

          // Parkings
          oCtx.fillStyle = 'rgba(30, 58, 138, 0.4)';
          for (const pk of world.parkings) {
            oCtx.fillRect(pk.x, pk.y, pk.width, pk.height);
          }

          // Fountain
          oCtx.fillStyle = '#0284c7';
          oCtx.beginPath();
          oCtx.arc(4400, 2800, 45, 0, Math.PI * 2);
          oCtx.fill();

          oCtx.restore();
        }
        staticMinimapCanvasRef.current = offscreen;
      }

      if (staticMinimapCanvasRef.current) {
        ctx.drawImage(staticMinimapCanvasRef.current, 0, 0);
      }

      ctx.save();
      ctx.scale(scale, scale);

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
        const isGreen = phase ? (phase.nsState === 'green'|| phase.nsState === 'green_flashing') : false;
        ctx.fillStyle = isGreen ? '#22c55e': '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      // Vehicles
      for (const veh of world.vehicles) {
        ctx.fillStyle = veh.isPlayerControlled ? '#38bdf8': (veh.isParked ? '#64748b': '#f59e0b');
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

      ctx.restore();
    } else {
      // Tactical Radar Minimap (Centered on Player, Rotated with Camera)
      const radarRange = minimapRangeRef.current || 550;
      const scale = w / (radarRange * 2);

      ctx.translate(w / 2, h / 2);
      ctx.rotate(-camera.angle - Math.PI / 2);
      ctx.scale(scale, scale);
      ctx.translate(-player.x, -player.y);

      const minX = player.x - radarRange - 50;
      const maxX = player.x + radarRange + 50;
      const minY = player.y - radarRange - 50;
      const maxY = player.y + radarRange + 50;

      // Parks & Terrain (Culled)
      ctx.fillStyle = '#064e3b35';
      if (maxX >= 100 && minX <= 2700 && maxY >= 100 && minY <= 2700) {
        ctx.fillRect(100, 100, 2600, 2600); // Forest
      }
      if (maxX >= 3700 && minX <= 5100 && maxY >= 2100 && minY <= 3500) {
        ctx.fillRect(3700, 2100, 1400, 1400); // Central Park
      }

      // Fountain (Culled)
      if (Math.hypot(4400 - player.x, 2800 - player.y) <= radarRange + 60) {
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(4400, 2800, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Buildings Footprints (Culled)
      ctx.fillStyle = '#1e293b80';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      for (const bld of world.buildings) {
        if (bld.type === 'park_monument') continue;
        if (bld.x + bld.width < minX || bld.x > maxX || bld.y + bld.height < minY || bld.y > maxY) continue;
        ctx.fillRect(bld.x, bld.y, bld.width, bld.height);
        ctx.strokeRect(bld.x, bld.y, bld.width, bld.height);
      }

      // Parking Lots (Culled)
      ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      for (const pk of world.parkings) {
        if (pk.x + pk.width < minX || pk.x > maxX || pk.y + pk.height < minY || pk.y > maxY) continue;
        ctx.fillRect(pk.x, pk.y, pk.width, pk.height);
        ctx.strokeRect(pk.x, pk.y, pk.width, pk.height);
      }

      // Roads (Culled)
      for (const road of world.roads) {
        if (road.isRoundabout) continue;
        const roadColor = road.isDirt ? '#855836' : (road.isGravel ? '#78716c' : '#383b42');

        if (road.curvePoints && road.curvePoints.length > 1) {
          const rMinX = (road._minX ?? Math.min(...road.curvePoints.map(p => p.x))) - road.width;
          const rMaxX = (road._maxX ?? Math.max(...road.curvePoints.map(p => p.x))) + road.width;
          const rMinY = (road._minY ?? Math.min(...road.curvePoints.map(p => p.y))) - road.width;
          const rMaxY = (road._maxY ?? Math.max(...road.curvePoints.map(p => p.y))) + road.width;
          if (rMaxX < minX || rMinX > maxX || rMaxY < minY || rMinY > maxY) continue;

          ctx.save();
          ctx.strokeStyle = roadColor;
          ctx.lineWidth = road.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(road.curvePoints[0].x, road.curvePoints[0].y);
          for (let i = 1; i < road.curvePoints.length; i++) {
            ctx.lineTo(road.curvePoints[i].x, road.curvePoints[i].y);
          }
          ctx.stroke();

          // Centerline marking for highways on radar
          if (!road.isDirt && !road.isGravel && road.width >= 40) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.setLineDash([12, 10]);
            ctx.beginPath();
            ctx.moveTo(road.curvePoints[0].x, road.curvePoints[0].y);
            for (let i = 1; i < road.curvePoints.length; i++) {
              ctx.lineTo(road.curvePoints[i].x, road.curvePoints[i].y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
          ctx.restore();
          continue;
        }

        const rMinX = Math.min(road.x1, road.x2) - road.width;
        const rMaxX = Math.max(road.x1, road.x2) + road.width;
        const rMinY = Math.min(road.y1, road.y2) - road.width;
        const rMaxY = Math.max(road.y1, road.y2) + road.width;
        if (rMaxX < minX || rMinX > maxX || rMaxY < minY || rMinY > maxY) continue;

        const dx = road.x2 - road.x1;
        const dy = road.y2 - road.y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.5) continue;
        ctx.save();
        ctx.fillStyle = roadColor;
        ctx.translate(road.x1, road.y1);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillRect(0, -road.width / 2, len, road.width);
        ctx.restore();
      }
      if (world.roundabouts) {
        for (const rb of world.roundabouts) {
          if (rb.x + rb.radius < minX || rb.x - rb.radius > maxX || rb.y + rb.radius < minY || rb.y - rb.radius > maxY) continue;
          ctx.fillStyle = '#32343a';
          ctx.beginPath();
          ctx.arc(rb.x, rb.y, rb.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3a3b3f';
          ctx.beginPath();
          ctx.arc(rb.x, rb.y, rb.innerRadius, 0, Math.PI * 2);
          ctx.fill();
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

      // GPS Destination Flag (Culled)
      if (world.gpsDestination) {
        const dest = world.gpsDestination;
        if (Math.abs(dest.x - player.x) <= radarRange + 60 && Math.abs(dest.y - player.y) <= radarRange + 60) {
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
      }

      // Intersections & Traffic Lights (Culled)
      for (const inter of world.intersections) {
        if (Math.abs(inter.x - player.x) > radarRange + 60 || Math.abs(inter.y - player.y) > radarRange + 60) continue;
        const phase = inter.phases?.[inter.currentPhaseIndex] || inter.phases?.[0];
        const isGreen = phase ? (phase.nsState === 'green'|| phase.nsState === 'green_flashing') : false;
        ctx.fillStyle = isGreen ? '#22c55e': '#ef4444';
        ctx.beginPath();
        ctx.arc(inter.x, inter.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      // City Establishments & Shops (Culled)
      for (const shop of CITY_SHOPS) {
        if (Math.abs(shop.x - player.x) > radarRange + 60 || Math.abs(shop.y - player.y) > radarRange + 60) continue;
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

      // NPC Cars (Culled)
      for (const veh of world.vehicles) {
        if (!veh.isPlayerControlled) {
          if (Math.abs(veh.x - player.x) > radarRange + 60 || Math.abs(veh.y - player.y) > radarRange + 60) continue;
          ctx.fillStyle = veh.isParked ? '#64748b': '#f59e0b';
          ctx.beginPath();
          ctx.arc(veh.x, veh.y, 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pedestrians (Culled)
      ctx.fillStyle = '#c084fc';
      for (const ped of world.pedestrians) {
        if (Math.abs(ped.x - player.x) > radarRange + 60 || Math.abs(ped.y - player.y) > radarRange + 60) continue;
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
    <div id="game-container"className="relative w-full h-full overflow-hidden bg-slate-950 font-sans select-none">
      {/* Primary Canvas */}
      <canvas
        id="main-canvas"ref={canvasRef}
        className="absolute inset-0 w-full h-full block cursor-crosshair"/>

      {/* TOP-LEFT: CITY HUD & ATMOSPHERE */}
      <div id="hud-top-left"className="absolute top-3 left-3 sm:top-4 sm:left-4 z-50 flex flex-col gap-2 pointer-events-none select-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2.5 shadow-xl text-white flex items-center gap-2 sm:gap-3 pointer-events-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Compass className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400 animate-pulse"/>
            <span className="font-semibold text-xs sm:text-sm tracking-wide line-clamp-1 max-w-[110px] sm:max-w-[180px]">{streetName}</span>
          </div>
          <div className="h-4 w-px bg-slate-700"/>
          <button
            onClick={() => setIsPerfConsoleOpen((prev) => !prev)}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsPerfConsoleOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs rounded-lg px-2 py-1 transition-all duration-200 border cursor-pointer active:scale-95 ${
              isPerfConsoleOpen
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-400 font-semibold shadow-inner': 'bg-slate-800/40 border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white'}`}
            title="Профайлер нагрузки [~]"id="perf-profiler-btn">
            <span className={`w-2 h-2 rounded-full ${
              fps >= 45 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]':
              fps >= 25 ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse':
              'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)] animate-ping'}`} />
            <span>{fps} FPS</span>
          </button>
          <div className="hidden md:block h-4 w-px bg-slate-700"/>
          <div className="hidden md:block text-xs text-slate-400">
            {trafficCount} Cars · {pedCount} Peds
          </div>

          <div className="h-4 w-px bg-slate-700"/>
          {/* Menu dropdown trigger */}
          <button
            id="quick-settings-toggle-btn"onClick={(e) => {
              e.stopPropagation();
              setIsQuickMenuOpen((prev) => !prev);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsQuickMenuOpen((prev) => !prev);
            }}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow active:scale-95"title="Настройки среды / Чит-меню">
            <Settings className="w-4 h-4 text-slate-200"/>
          </button>
        </div>

        {/* Quick Settings Dropdown */}
        {isQuickMenuOpen && (
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl p-2.5 shadow-2xl flex flex-wrap gap-2 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150 max-w-xs sm:max-w-sm max-h-[75vh] overflow-y-auto z-50">
            <button
              id="time-toggle-btn"onClick={cycleTimePreset}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cycleTimePreset();
              }}
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"title="Переключить время суток (T)">
              {getTimeLabelName(timeHour) === 'Morning'&& <Sunrise className="w-3.5 h-3.5 text-amber-400"/>}
              {getTimeLabelName(timeHour) === 'Day'&& <Sun className="w-3.5 h-3.5 text-amber-300"/>}
              {getTimeLabelName(timeHour) === 'Sunset'&& <Sunrise className="w-3.5 h-3.5 text-orange-400"/>}
              {getTimeLabelName(timeHour) === 'Night'&& <Moon className="w-3.5 h-3.5 text-sky-300"/>}
              <span className="capitalize">{getTimeLabelName(timeHour)}</span>
            </button>

            <button
              id="weather-toggle-btn"onClick={cycleWeather}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                cycleWeather();
              }}
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"title="Переключить погоду">
              {weather === 'clear'&& <Sun className="w-3.5 h-3.5 text-amber-300"/>}
              {weather === 'rain'&& <CloudRain className="w-3.5 h-3.5 text-blue-400"/>}
              {weather === 'fog'&& <Cloud className="w-3.5 h-3.5 text-slate-300"/>}
              {weather === 'storm'&& <CloudLightning className="w-3.5 h-3.5 text-purple-400"/>}
              <span className="capitalize">{weather}</span>
            </button>

            <button
              id="sound-toggle-btn"onClick={toggleSoundMute}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSoundMute();
              }}
              className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400"/> : <Volume2 className="w-3.5 h-3.5 text-emerald-400"/>}
              <span>{isMuted ? 'Mute': 'Звук'}</span>
            </button>

            {/* Online Multiplayer Toggle Button */}
            <button
              id="online-toggle-btn"onClick={() => {
                sound.playButtonPress();
                setIsOnlineModalOpen((prev) => !prev);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                sound.playButtonPress();
                setIsOnlineModalOpen((prev) => !prev);
              }}
              className={`border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                onlineStatus === 'connected'? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:border-emerald-400': 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Онлайн режим (комнаты, чат, синхронизация) [O]">
              <Radio className={`w-3.5 h-3.5 ${onlineStatus === 'connected'? 'text-emerald-400 animate-pulse': 'text-sky-400'}`} />
              <span>{onlineStatus === 'connected'? `Онлайн (${onlinePlayerCount})`: 'Онлайн [O]'}</span>
            </button>

            {/* User Profile & Auth / Cloud Save Button */}
            <button
              id="user-profile-toggle-btn"onClick={() => {
                sound.playButtonPress();
                setIsUserProfileModalOpen(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                sound.playButtonPress();
                setIsUserProfileModalOpen(true);
              }}
              className="border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium"title="Настройка профиля, облачные сохранения и серверы">
              <Users className="w-3.5 h-3.5 text-emerald-400"/>
              <span>{currentUser ? (currentUser.displayName || 'Профиль') : 'Войти'}</span>
            </button>

            <button
              id="touch-toggle-btn"onClick={() => setIsMobileTouch((prev) => !prev)}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMobileTouch((prev) => !prev);
              }}
              className={`border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                isMobileTouch
                  ? 'bg-sky-950/80 border-sky-500/40 text-sky-200': 'bg-slate-800 border-slate-700 text-slate-400'}`}
              title="Переключить сенсорный интерфейс">
              <Smartphone className="w-3.5 h-3.5"/>
              <span>Тач {isMobileTouch ? 'ВКЛ': 'ВЫКЛ'}</span>
            </button>

            <button
              id="spawn-point-btn"onClick={() => {
                setIsSpawnMenuOpen(true);
                setIsQuickMenuOpen(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsSpawnMenuOpen(true);
                setIsQuickMenuOpen(false);
              }}
              className="bg-emerald-950/80 hover:bg-emerald-900 active:bg-emerald-800 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
              <MapPin className="w-3.5 h-3.5 text-emerald-400"/>
              <span>Спавн</span>
            </button>

            <button
              id="open-ai-console-btn"onClick={() => {
                setIsConsoleOpen(true);
                setIsQuickMenuOpen(false);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsConsoleOpen(true);
                setIsQuickMenuOpen(false);
              }}
              className="bg-indigo-950/80 hover:bg-indigo-900 active:bg-indigo-800 border border-indigo-500/40 rounded-lg px-2.5 py-1.5 text-xs text-indigo-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer">
              <Terminal className="w-3.5 h-3.5 text-indigo-400"/>
              <span>AI Console</span>
            </button>

            <button
              id="reset-all-damage-btn"onClick={handleResetAllVehiclesDamage}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResetAllVehiclesDamage();
              }}
              className="bg-rose-950/80 hover:bg-rose-900 active:bg-rose-800 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-rose-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"title="Сбросить повреждения всех транспортных средств">
              <Wrench className="w-3.5 h-3.5 text-rose-400"/>
              <span>Починить всё</span>
            </button>

            <button
              id="reset-player-injuries-btn"onClick={handleResetPlayerInjuries}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleResetPlayerInjuries();
              }}
              className="bg-emerald-950/80 hover:bg-emerald-900 active:bg-emerald-800 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-emerald-200 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"title="Вылечить все травмы и переломы персонажа">
              <Heart className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20"/>
              <span>Вылечить себя</span>
            </button>

            <button
              id="creative-mode-toggle-btn"onClick={() => {
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
                    newVal ? 'Режим Творчества ВКЛЮЧЕН! Открыта панель управления.': 'Режим Творчества ВЫКЛЮЧЕН.', 
                    newVal ? 'info': 'warning');
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
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
                    newVal ? 'Режим Творчества ВКЛЮЧЕН! Открыта панель управления.': 'Режим Творчества ВЫКЛЮЧЕН.', 
                    newVal ? 'info': 'warning');
                }
              }}
              className={`border rounded-lg px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isCreativeMode
                  ? 'bg-amber-950/80 border-amber-500 text-amber-200': 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
              title="Переключить Режим Творчества">
              <Sparkles className={`w-3.5 h-3.5 ${isCreativeMode ? 'text-amber-400 animate-pulse': ''}`} />
              <span>Творчество: {isCreativeMode ? 'ВКЛ': 'ВЫКЛ'}</span>
            </button>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: GPS NAVIGATOR MINIMAP */}
      <div id="hud-top-right"className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 flex flex-col items-end gap-1.5 pointer-events-auto select-none">
        {isMinimapCollapsed ? (
          <div className="flex items-center gap-1.5">
            {/* Zoom Controls */}
            <div className="flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-0.5 shadow-xl">
              <button
                type="button"onClick={() => {
                  userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15);
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white active:bg-slate-800 rounded-lg transition"title="Приблизить камеру">
                <ZoomIn className="w-3.5 h-3.5"/>
              </button>
              <div className="h-px bg-slate-800 my-0.5"/>
              <button
                type="button"onClick={() => {
                  userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15);
                }}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-white active:bg-slate-800 rounded-lg transition"title="Отдалить камеру">
                <ZoomOut className="w-3.5 h-3.5"/>
              </button>
            </div>

            {/* Expand Minimap Button */}
            <button
              id="expand-minimap-btn"onClick={() => setIsMinimapCollapsed(false)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsMinimapCollapsed(false);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-900/95 backdrop-blur-xl border border-sky-500/40 rounded-xl shadow-xl flex items-center justify-center text-sky-400 hover:text-sky-300 active:scale-95 transition"title="Развернуть миникарту [M]">
              <Map className="w-4 h-4 sm:w-5 sm:h-5"/>
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            {/* Quick Zoom Buttons alongside minimap */}
            <div className="flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-0.5 shadow-xl">
              <button
                type="button"onClick={() => {
                  userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  userZoomFactorRef.current = Math.min(3.0, userZoomFactorRef.current + 0.15);
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-300 hover:text-white active:bg-slate-800 rounded-lg transition"title="Приблизить камеру">
                <ZoomIn className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
              </button>
              <div className="h-px bg-slate-800 my-0.5"/>
              <button
                type="button"onClick={() => {
                  userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  userZoomFactorRef.current = Math.max(0.4, userZoomFactorRef.current - 0.15);
                }}
                className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-slate-300 hover:text-white active:bg-slate-800 rounded-lg transition"title="Отдалить камеру">
                <ZoomOut className="w-3 h-3 sm:w-3.5 sm:h-3.5"/>
              </button>
            </div>

            {/* Radar Minimap Box (Compact & Elegant) */}
            <div 
              id="minimap-radar-container"className="w-[84px] h-[84px] sm:w-[130px] sm:h-[130px] bg-slate-950/90 backdrop-blur-xl border border-white/15 rounded-xl p-1 shadow-2xl overflow-hidden relative group cursor-pointer active:scale-95 transition-all hover:border-sky-500/40"onClick={() => setIsFullMapOpen(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsFullMapOpen(true);
              }}
              title="Нажмите для открытия карты города на весь экран">
              <canvas
                id="minimap-canvas"ref={minimapCanvasRef}
                width={200}
                height={200}
                className="w-full h-full rounded-lg block pointer-events-none"/>
              {/* Top Buttons: Collapse & GPS label */}
              <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                <button
                  id="collapse-minimap-btn"onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimapCollapsed(true);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsMinimapCollapsed(true);
                  }}
                  className="w-5 h-5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center border border-white/10 active:scale-90 transition"title="Свернуть миникарту">
                  <Minimize2 className="w-2.5 h-2.5 sm:w-3 sm:h-3"/>
                </button>
              </div>

              {/* Bottom indicator badge */}
              <div className="absolute bottom-1.5 left-1.5 bg-slate-900/80 backdrop-blur-md border border-white/10 text-sky-400 text-[8px] sm:text-[9px] font-bold px-1 py-0.5 rounded shadow pointer-events-none flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"/>
                <span>GPS</span>
              </div>
            </div>
          </div>
        )}
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
            timeHour={timeHour}
            weather={weather}
            onToggleTurnSignal={toggleTurnSignal}
            onToggleHeadlights={toggleHeadlights}
            onToggleEngine={handleToggleEngine}
            onOpenRadialMenu={() => setIsRadialMenuOpen(true)}
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
          handleInteractE();
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
            const TOPICAL_ITEMS = ['bandage', 'splint', 'medical_patch', 'antiseptic', 'panthenol_spray', 'spasatel_ointment', 'zelenka', 'iodine', 'diclofenac_gel', 'hydrogen_peroxide'];
            if (item && item.category === 'med'&& TOPICAL_ITEMS.includes(item.itemId)) {
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
        onInspectDocument={(item) => {
          setSelectedPropertyDocItem(item);
          setIsPropertyDocumentModalOpen(true);
        }}
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

      {/* INTERACTIVE SMARTPHONE MODAL */}
      {activePhoneItem && (
        <PhoneModal
          item={activePhoneItem}
          player={playerRef.current}
          world={worldRef.current}
          onClose={() => setActivePhoneItem(null)}
        />
      )}

      {/* CAR DEALERSHIP MODAL */}
      <CarDealershipModal
        isOpen={isDealershipOpen}
        onClose={() => setIsDealershipOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        dealershipX={252}
        dealershipY={5916}
      />

      {/* SHOP & AUTO REPAIR MODAL */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        player={playerRef.current}
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

              items.forEach((item, idx) => {
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
                  const boughtItem = createItem(item.itemId, 1);
                  const angle = (p.angle || 0) + (Math.random() * 0.9 - 0.45);
                  const dist = 28 + (idx * 14) % 40;
                  w.groundItems.push({
                    id: `ground_bought_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
                    x: p.x + Math.cos(angle) * dist,
                    y: p.y + Math.sin(angle) * dist,
                    item: boughtItem,
                    spawnTime: Date.now()
                  });
                }
              });

              sound.playUseItem();
              if (regularItemsCount > 0) {
                addPlayerNotification(p, `Куплено: ${regularItemsCount} поз. (-$${totalCost}). Товары выложены на прилавок!`, 'pickup');
              }
              setVitalsRefreshTick((t) => t + 1);
            }
          } else {
            addPlayerNotification(p, 'Недостаточно денег на балансе!', 'warning');
          }
        }}
        onRepairVehicle={(alreadyPaid) => {
          const p = playerRef.current;
          const w = worldRef.current;
          if (!p || !w) return;
          if (!alreadyPaid) {
            const currentCash = getPlayerCash(p);
            if (currentCash < 300) {
              addPlayerNotification(p, 'Недостаточно денег для ремонта ($300)', 'warning');
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
              deductPlayerCash(p, 300);
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
              targetCar.engineState.starterWorking = true;
            }
            
            // 3. Fully repair fuel system (leaks and pressure rail)
            if (targetCar.fuelSystem) {
              targetCar.fuelSystem.tankPunctured = false;
              targetCar.fuelSystem.fuelRailBroken = false;
            }

            sound.playUseItem();
            const costText = alreadyPaid ? '': '(-$300)';
            addPlayerNotification(p, `Автомобиль успешно отремонтирован на подъемнике PIT-STOP!${costText}`, 'heal');
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

      {/* GTA-STYLE VEHICLE CONTROLS RADIAL MENU */}
      <RadialMenu
        isOpen={isRadialMenuOpen}
        onClose={() => setIsRadialMenuOpen(false)}
        player={playerRef.current}
        world={worldRef.current}
        onToggleWipers={handleToggleWipers}
        onToggleHeadlights={toggleHeadlights}
        onToggleFrontFogLights={handleToggleFrontFogLights}
        onToggleRearFogLights={handleToggleRearFogLights}
        onToggleSiren={handleToggleSiren}
        onToggleTurnSignal={toggleTurnSignal}
        onChangeHeaterMode={handleChangeHeaterMode}
        onToggleEngine={handleToggleEngine}
        onToggleWindow={handleToggleWindow}
        onToggleTrailerHitch={handleToggleTrailerHitch}
        onToggleRoadTrainLights={handleToggleRoadTrainLights}
        onCycleDiffLock={() => {
          inputRef.current.diffLockToggle = true;
        }}
      />

      {/* GAS STATION: FUEL NOZZLE SELECTOR MODAL */}
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
              `Взят пистолет [${grade.nameRu}]. Подойдите к лючку бензобака автомобиля и нажмите [E].`,
              'info');
            setIsFuelNozzleModalOpen(false);
            setVitalsRefreshTick((t) => t + 1);
          }
        }}
      />

      {/* GAS STATION: CASHIER POS TERMINAL MODAL */}
      {worldRef.current && playerRef.current && (
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

      {/* UNIFIED CONTEXT INTERACTION HUD */}
      <ContextInteractionHUD
        target={activeInteraction}
        onExecute={handleExecuteActiveInteraction}
      />

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

      {/* CREATIVE MODE SIDEBAR & CONTROL PANEL */}
      {isCreativeMode && !isMainMenuOpen && (
        <div 
          id="creative-sidebar-panel"className="absolute top-24 left-4 z-20 w-80 max-h-[calc(100vh-140px)] bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden animate-in slide-in-from-left duration-200 text-white">
          {/* Header */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400 animate-pulse animate-duration-1000"/>
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
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"title="Закрыть режим творчества">
              <X className="w-4 h-4"/>
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/30 p-1 shrink-0">
            {(['vehicles', 'props', 'items', 'cheats'] as const).map((tab) => {
              const label = 
                tab === 'vehicles'? 'Авто':
                tab === 'props'? 'Пропы':
                tab === 'items'? 'Вещи': 'Читы';
              return (
                <button
                  key={tab}
                  onClick={() => setCreativeTab(tab)}
                  className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    creativeTab === tab
                      ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-inner': 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border border-transparent'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
            {creativeTab === 'vehicles'&& (
              <div className="space-y-3">
                {/* Color Picker Row */}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Цвет спавна авто:</span>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    {[
                      { hex: '#f43f5e', name: 'Красный'},
                      { hex: '#f97316', name: 'Оранжевый'},
                      { hex: '#eab308', name: 'Жёлтый'},
                      { hex: '#22c55e', name: 'Зелёный'},
                      { hex: '#06b6d4', name: 'Бирюзовый'},
                      { hex: '#38bdf8', name: 'Голубой'},
                      { hex: '#a855f7', name: 'Фиолетовый'},
                      { hex: '#ffffff', name: 'Белый'},
                      { hex: '#1e293b', name: 'Чёрный'}
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
                            ? 'scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]': 'border-slate-800 hover:scale-[1.05]'}`}
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
                          activePlacement?.type === 'vehicle'&& activePlacement.id === key
                            ? 'border-amber-500 bg-amber-500/5 text-amber-200 shadow-sm shadow-amber-500/20': 'border-slate-800/80 text-slate-300'}`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <span className="text-sm">
                            {(config.type || '').includes('bus') ? '': (config.type || '').includes('fire') ? '': (config.type || '').includes('police') ? '': ''}
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

            {creativeTab === 'props'&& (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">Выберите проп / объект:</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    { id: 'cone', label: 'Дорожный конус '},
                    { id: 'bollard', label: 'Столбик ограждения '},
                    { id: 'bench', label: 'Уличная скамейка '},
                    { id: 'trash_can', label: 'Мусорный бак '},
                    { id: 'dumpster', label: 'Мусорный контейнер '},
                    { id: 'hydrant', label: 'Пожарный гидрант '},
                    { id: 'mailbox', label: 'Почтовый ящик '},
                    { id: 'lamp_highway', label: 'Автомобильный фонарь (с выносом) '},
                    { id: 'lamp_concrete', label: 'Старый бетонный столб (несбиваемый) '},
                    { id: 'lamp', label: 'Парковый фонарь '},
                    { id: 'bus_stop', label: 'Автобусная остановка '},
                    { id: 'kiosk', label: 'Газетный киоск '},
                    { id: 'flowerbed', label: 'Клумба с цветами '},
                    { id: 'tire_flowerbed', label: 'Клумба из покрышки '}
                  ].map((prop) => (
                    <button
                      key={prop.id}
                      onClick={() => {
                        setActivePlacement({
                          type: 'prop',
                          id: prop.id,
                          nameRu: prop.label.split('')[0],
                          angle: 0
                        });
                      }}
                      className={`w-full p-2 text-left bg-slate-950/40 hover:bg-slate-800/40 border transition-all rounded-xl flex items-center justify-between cursor-pointer group ${
                        activePlacement?.type === 'prop'&& activePlacement.id === prop.id
                          ? 'border-amber-500 bg-amber-500/5 text-amber-200 shadow-sm shadow-amber-500/20': 'border-slate-800/80 text-slate-300'}`}
                    >
                      <span className="text-xs font-medium truncate group-hover:text-slate-100">{prop.label}</span>
                      <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-400/80 shrink-0">Place</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {creativeTab === 'items'&& (
              <div className="space-y-3">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500"/>
                  <input
                    type="text"value={creativeItemSearch}
                    onChange={(e) => setCreativeItemSearch(e.target.value)}
                    placeholder="Поиск предметов..."className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"/>
                </div>

                {/* Items Catalog List */}
                <div className="space-y-4">
                  {[
                    { title: 'Еда и напитки', cat: 'food_drink'},
                    { title: 'Медикаменты', cat: 'med'},
                    { title: 'Автоинструменты', cat: 'tool'},
                    { title: 'Ценности и валюта', cat: 'valuable'}
                  ].map((group) => {
                    const filteredItems = Object.entries(ITEM_CATALOG).filter(([key, item]) => {
                      const matchesCategory = 
                        group.cat === 'food_drink'? (item.category === 'food'|| item.category === 'drink') :
                        group.cat === 'med'? (item.category === 'med') :
                        group.cat === 'valuable'? (item.category === 'valuable') :
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
                              className="p-2 bg-slate-950/30 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-lg shrink-0">{item.icon || ''}</span>
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
                                  className="px-1.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[10px] text-slate-300 font-bold transition-all cursor-pointer"title="Выдать 1 шт">
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
                                  className="px-1.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[10px] text-white font-bold transition-all cursor-pointer"title={`Выдать полный стак (${item.maxStack || 5} шт)`}
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

            {creativeTab === 'cheats'&& (
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Чит-коды и управление:</span>
                
                {/* Flight / Noclip Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Plane className={`w-4 h-4 ${isFlying ? 'text-amber-400 animate-bounce': 'text-slate-500'}`} />
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
                        addPlayerNotification(p, val ? 'Полёт активирован!': 'Режим ходьбы.', val ? 'info': 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isFlying ? 'bg-amber-500 flex justify-end': 'bg-slate-800 flex justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow"/>
                  </button>
                </div>

                {/* Invincibility Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className={`w-4 h-4 ${isInvincible ? 'text-emerald-400 animate-pulse animate-duration-1000': 'text-slate-500'}`} />
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
                        addPlayerNotification(p, val ? 'Вы бессмертны! Травмы очищены.': 'Режим смертности включен.', val ? 'heal': 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isInvincible ? 'bg-emerald-500 flex justify-end': 'bg-slate-800 flex justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow"/>
                  </button>
                </div>

                {/* Grid Mode (G) Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Grid className={`w-4 h-4 ${isGridMode ? 'text-cyan-400 animate-pulse': 'text-slate-500'}`} />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200">Сетка деформации (Grid G)</div>
                      <div className="text-[9px] text-slate-400">Визуализация 3D-сетки BeamNG</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const cam = cameraRef.current;
                      cam.gridMode = !cam.gridMode;
                      const val = !!cam.gridMode;
                      setIsGridMode(val);
                      const p = playerRef.current;
                      if (p) {
                        addPlayerNotification(p, `Режим сетки (Grid Mode) ${val ? 'ВКЛ': 'ВЫКЛ'}`, val ? 'info': 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isGridMode ? 'bg-cyan-500 flex justify-end': 'bg-slate-800 flex justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow"/>
                  </button>
                </div>

                {/* Clean Crash Test Mode Switch */}
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${isCleanMode ? 'text-amber-300 animate-spin': 'text-slate-500'}`} />
                    <div className="text-xs">
                      <div className="font-semibold text-slate-200">Чистый режим (Краштест)</div>
                      <div className="text-[9px] text-slate-400">Без дыма/пара (огонь остаётся) + 0 урон игроку</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const val = !isCleanMode;
                      setIsCleanMode(val);
                      isCleanModeRef.current = val;
                      const world = worldRef.current;
                      if (world) {
                        world.cleanMode = val;
                        if (val && world.particles) {
                          world.particles = world.particles.filter(p => p.type !== 'engine_smoke'&& p.type !== 'tire_smoke'&& p.type !== 'exhaust');
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
                        addPlayerNotification(p, val ? 'Чистый режим ВКЛ! Дым/пар убраны, урон отключен.': 'Чистый режим ВЫКЛ.', val ? 'info': 'warning');
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-all cursor-pointer ${
                      isCleanMode ? 'bg-amber-500 flex justify-end': 'bg-slate-800 flex justify-start'}`}
                  >
                    <div className="w-4 h-4 rounded-full bg-slate-100 shadow"/>
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
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-xl text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Coins className="w-4 h-4 text-amber-400 animate-bounce"/>
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
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] border border-slate-700/60 rounded-xl text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Wrench className="w-4 h-4 text-sky-400"/>
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
                  className="w-full py-2.5 px-3 bg-rose-950/50 hover:bg-rose-900/60 border border-rose-500/25 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Trash2 className="w-4 h-4"/>
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
            <Wand2 className="w-4 h-4 animate-spin"/>
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
            className="mt-1 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 cursor-pointer">
            Отмена (Правый клик / Esc)
          </button>
        </div>
      )}

      {/* Pause Menu Overlay */}
      {isPauseMenuOpen && !isMainMenuOpen && (
        <PauseMenu
          onResume={() => setIsPauseMenuOpen(false)}
          onSave={() => {
            handleCreateSave();
            const p = playerRef.current;
            if (p) addPlayerNotification(p, 'Игра успешно сохранена!', 'info');
          }}
          onOpenSettings={() => {
            setIsPauseMenuOpen(false);
            setIsMainMenuOpen(true);
          }}
          onOpenOnline={() => {
            setIsPauseMenuOpen(false);
            setIsOnlineModalOpen(true);
          }}
          onOpenProfile={() => {
            setIsPauseMenuOpen(false);
            setIsUserProfileModalOpen(true);
          }}
          onExitToMainMenu={() => {
            setIsPauseMenuOpen(false);
            setIsMainMenuOpen(true);
            sound.stopEngine();
          }}
        />
      )}

      {/* Main Menu Overlay */}
      {isMainMenuOpen && (
        <MainMenu
          onResume={() => setIsMainMenuOpen(false)}
          onNewGame={(saveName, spawnId) => {
            handleNewGame(spawnId);
            setTimeout(() => {
              handleCreateSave(saveName);
            }, 50);
          }}
          saves={saves}
          onLoadSave={handleLoadSave}
          onDeleteSave={handleDeleteSave}
          onCreateSave={handleCreateSave}
          isMuted={isMuted}
          onToggleMute={toggleSoundMute}
          settings={settings}
          onUpdateSettings={setSettings}
          spawnLocations={SPAWN_LOCATIONS}
          onOpenOnline={() => {
            setIsOnlineModalOpen(true);
          }}
          onOpenProfile={() => {
            setIsUserProfileModalOpen(true);
          }}
        />
      )}

      {/* Online P2P Multiplayer Modal */}
      <OnlineModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onOpenFriends={() => setIsFriendsModalOpen(true)}
      />

      {/* Friends & Social System Modal */}
      <FriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        onJoinRoom={(code) => {
          onlineManager.joinOrCreateRoom(code, onlineManager.localPlayerName, false);
          setIsOnlineModalOpen(true);
        }}
      />

      {/* Real-time World Invite Toast Notification */}
      <WorldInviteToast
        onJoinRoom={(code) => {
          onlineManager.joinOrCreateRoom(code, onlineManager.localPlayerName, false);
          setIsOnlineModalOpen(true);
        }}
      />

      {/* Firebase User Profile & Cloud Saves Modal */}
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

      {/* Real Estate Purchase & Agency Modal */}
      {playerRef.current && (
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
      <PropertyDocumentModal
        isOpen={isPropertyDocumentModalOpen}
        onClose={() => {
          setIsPropertyDocumentModalOpen(false);
          setSelectedPropertyDocItem(null);
        }}
        documentItem={selectedPropertyDocItem}
      />

      {/* Apartment Furniture Storage Modal */}
      {isFurnitureStorageOpen && furnitureStorageData && playerRef.current && (
        <FurnitureStorageModal
          isOpen={isFurnitureStorageOpen}
          onClose={() => {
            setIsFurnitureStorageOpen(false);
            setFurnitureStorageData(null);
          }}
          storage={getFurnitureStorage(
            furnitureStorageData.buildingId,
            furnitureStorageData.floor,
            furnitureStorageData.furnitureIndex,
            furnitureStorageData.furnitureType,
            furnitureStorageData.aptId,
            furnitureStorageData.customTitle
          )}
          player={playerRef.current}
          world={worldRef.current}
          buildingId={furnitureStorageData.buildingId}
          floor={furnitureStorageData.floor}
          furnitureIndex={furnitureStorageData.furnitureIndex}
          furnitureType={furnitureStorageData.furnitureType}
          aptId={furnitureStorageData.aptId}
          customTitle={furnitureStorageData.customTitle}
          onInventoryUpdated={() => {
            setVitalsRefreshTick(t => t + 1);
            saveFurnitureStoragesToLocalStorage();
          }}
          onVitalsChange={() => {
            setVitalsRefreshTick(t => t + 1);
            saveFurnitureStoragesToLocalStorage();
          }}
        />
      )}

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
        />
      )}
    </div>
  );
}

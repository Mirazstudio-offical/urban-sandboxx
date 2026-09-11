import React, { useState, useEffect, useRef } from 'react';
import { CarType, Vehicle, Player, GameWorld } from '../types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, createDefaultVehicleDamage } from '../vehicleHelpers';
import { 
  getVehicleBasePolygon, 
  getVehicleCabinDimensions, 
  renderVehicleGreenhouseAndBodyPanels, 
  renderSpecializedVehicleAttachments, 
  VehicleRenderContext 
} from '../vehicleVisuals';
import { traceSoftbodyPath, renderSoftbodyStressLines } from '../softbodyVisuals';
import { getPlayerCash, deductPlayerCash, createItem, addItemToPlayer } from '../items';
import { sound } from '../audio';

export interface DealershipCarModel {
  id: string;
  type: CarType;
  name: string;
  nameRu: string;
  brand: string;
  classType: string;
  year: number;
  engineSpec: string;
  powerHp: number;
  displacementL: number;
  fuelType: 'ai92' | 'ai95' | 'diesel';
  fuelTypeLabel: string;
  topSpeedKmh: number;
  accelSec: number;
  weightKg: number;
  tankCapacityL: number;
  dimensionsM: string;
  hasAutoTrans: boolean;
  hasManualTrans: boolean;
  priceRub: number;
  availableColors: { name: string; hex: string; roofHex?: string }[];
  descriptionRu: string;
}

export const DEALERSHIP_CARS: DealershipCarModel[] = [
  {
    id: 'deal_sedan_compact',
    type: 'sedan_compact',
    name: 'Бюджетный Седан (B-Класс)',
    nameRu: 'Бюджетный Седан (B-Класс)',
    brand: 'Автомобиль',
    classType: 'Компактный седан',
    year: 2021,
    engineSpec: '1.6L 16V Инжектор',
    powerHp: 106,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 180,
    accelSec: 10.8,
    weightKg: 1080,
    tankCapacityL: 50,
    dimensionsM: '4.26 x 1.70 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 390000,
    availableColors: [
      { name: 'Белое облако (240)', hex: '#f8fafc' },
      { name: 'Черный жемчуг (676)', hex: '#0f172a' },
      { name: 'Борнео (серебро)', hex: '#94a3b8' },
      { name: 'Платина (691)', hex: '#cbd5e1' },
      { name: 'Кориандр (золотистый)', hex: '#d97706' }
    ],
    descriptionRu: 'Самый популярный народный седан. Недорогой в обслуживании, экономичный двигатель 1.6L, выбор МКПП или АКПП.'
  },
  {
    id: 'deal_sedan_standard',
    type: 'sedan',
    name: 'Семейный Седан (C-Класс)',
    nameRu: 'Семейный Седан (C-Класс)',
    brand: 'Автомобиль',
    classType: 'Городской седан',
    year: 2022,
    engineSpec: '1.6L 16V DOHC',
    powerHp: 122,
    displacementL: 1.6,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 195,
    accelSec: 9.8,
    weightKg: 1270,
    tankCapacityL: 55,
    dimensionsM: '4.44 x 1.76 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 580000,
    availableColors: [
      { name: 'Сердолик (красный)', hex: '#dc2626' },
      { name: 'Дайвинг (синий)', hex: '#2563eb' },
      { name: 'Ледниковый белый', hex: '#ffffff' },
      { name: 'Плутон (темно-серый)', hex: '#334155' }
    ],
    descriptionRu: 'Современный городской седан с высоким клиренсом, вместительным багажником и современными системами безопасности.'
  },
  {
    id: 'deal_wagon_modern',
    type: 'wagon_modern',
    name: 'Современный Универсал',
    nameRu: 'Современный Универсал',
    brand: 'Автомобиль',
    classType: 'Универсал',
    year: 2022,
    engineSpec: '1.8L 16V ВАЗ',
    powerHp: 122,
    displacementL: 1.8,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 185,
    accelSec: 10.2,
    weightKg: 1320,
    tankCapacityL: 55,
    dimensionsM: '4.42 x 1.78 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 640000,
    availableColors: [
      { name: 'Марс (оранжевый)', hex: '#ea580c' },
      { name: 'Карфаген (серебристый)', hex: '#e2e8f0' },
      { name: 'Анкор (черный металлик)', hex: '#1e293b' },
      { name: 'Амазонка (зеленый)', hex: '#166534' }
    ],
    descriptionRu: 'Вместительный семейный универсал с рейлингами на крыше, огромным багажником и практичным салоном.'
  },
  {
    id: 'deal_crossover_compact',
    type: 'crossover_compact',
    name: 'Компактный Кроссовер 4WD',
    nameRu: 'Компактный Кроссовер 4WD',
    brand: 'Кроссовер',
    classType: 'Городской кроссовер',
    year: 2021,
    engineSpec: '2.0L 16V 143 л.с.',
    powerHp: 143,
    displacementL: 2.0,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 180,
    accelSec: 10.4,
    weightKg: 1420,
    tankCapacityL: 50,
    dimensionsM: '4.32 x 1.82 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 750000,
    availableColors: [
      { name: 'Оранжевый хаки', hex: '#f97316' },
      { name: 'Темный изумруд', hex: '#065f46' },
      { name: 'Перламутр белый', hex: '#f8fafc' },
      { name: 'Мокрый асфальт', hex: '#475569' }
    ],
    descriptionRu: 'Полноприводный кроссовер с отличной проходимостью, высокими колесными арками и надежным автоматом.'
  },
  {
    id: 'deal_hatchback',
    type: 'hatchback',
    name: 'Городской Хэтчбек',
    nameRu: 'Городской Хэтчбек',
    brand: 'Автомобиль',
    classType: 'Хэтчбек',
    year: 2020,
    engineSpec: '1.6L 16V Инжектор',
    powerHp: 106,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 175,
    accelSec: 11.2,
    weightKg: 1120,
    tankCapacityL: 50,
    dimensionsM: '4.16 x 1.71 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 430000,
    availableColors: [
      { name: 'Ярко-красный', hex: '#ef4444' },
      { name: 'Синий перламутр', hex: '#3b82f6' },
      { name: 'Белый', hex: '#ffffff' },
      { name: 'Серый графит', hex: '#64748b' }
    ],
    descriptionRu: 'Компактный 5-дверный хэтчбек. Удобен для парковки в тесных городских дворах и маневрирования в потоке.'
  },
  {
    id: 'deal_offroad_hardcore',
    type: 'offroad_hardcore',
    name: 'Внедорожник 4x4 «Тайга»',
    nameRu: 'Внедорожник 4x4 «Тайга»',
    brand: 'Внедорожник',
    classType: 'Внедорожник 4x4',
    year: 2022,
    engineSpec: '1.7L Инжектор 83 л.с.',
    powerHp: 83,
    displacementL: 1.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 142,
    accelSec: 17.0,
    weightKg: 1285,
    tankCapacityL: 65,
    dimensionsM: '3.74 x 1.68 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 490000,
    availableColors: [
      { name: 'Защитный хаки', hex: '#3f6212' },
      { name: 'Темно-зеленый', hex: '#14532d' },
      { name: 'Белый снег', hex: '#f8fafc' },
      { name: 'Несси (темно-синий)', hex: '#1e3a8a' }
    ],
    descriptionRu: 'Легендарный компактный полноприводный внедорожник с честным 4x4, понижающей передачей и блокировкой межосевого дифференциала.'
  },
  {
    id: 'deal_suv_luxury',
    type: 'suv_luxury',
    name: 'Рамный Люкс Внедорожник',
    nameRu: 'Рамный Люкс Внедорожник',
    brand: 'Внедорожник',
    classType: 'Рамный SUV',
    year: 2022,
    engineSpec: '2.7L ZMZ PRO 150 л.с.',
    powerHp: 150,
    displacementL: 2.7,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 150,
    accelSec: 12.7,
    weightKg: 2125,
    tankCapacityL: 68,
    dimensionsM: '4.78 x 1.90 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 1150000,
    availableColors: [
      { name: 'Черный металлик', hex: '#020617' },
      { name: 'Серый металлик (Астероид)', hex: '#475569' },
      { name: 'Белый перламутр', hex: '#ffffff' },
      { name: 'Темно-зеленый', hex: '#166534' }
    ],
    descriptionRu: 'Флагманский рамный внедорожник с автоматической коробкой Punch Powerglide, кожаным салоном и мультимедиа.'
  },
  {
    id: 'deal_sedan_luxury',
    type: 'sedan_luxury',
    name: 'Бизнес-Седан D-Класса',
    nameRu: 'Бизнес-Седан D-Класса',
    brand: 'Премиум',
    classType: 'Седан бизнес-класса',
    year: 2021,
    engineSpec: '2.5L DOHC 181 л.с.',
    powerHp: 181,
    displacementL: 2.5,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 220,
    accelSec: 8.4,
    weightKg: 1570,
    tankCapacityL: 60,
    dimensionsM: '4.88 x 1.84 м',
    hasAutoTrans: true,
    hasManualTrans: false,
    priceRub: 1480000,
    availableColors: [
      { name: 'Черный обсидиан', hex: '#0f172a' },
      { name: 'Серебристый металлик', hex: '#e2e8f0' },
      { name: 'Темно-синий перламутр', hex: '#1e3a8a' },
      { name: 'Белый перламутр', hex: '#f8fafc' }
    ],
    descriptionRu: 'Комфортабельный премиальный седан с мягкой подвеской, климат-контролем и 6-ступенчатым автоматом.'
  },
  {
    id: 'deal_pickup',
    type: 'pickup',
    name: 'Пикап 4x4 (Двухкабинный)',
    nameRu: 'Пикап 4x4 (Двухкабинный)',
    brand: 'Пикап',
    classType: 'Пикап 4WD',
    year: 2021,
    engineSpec: '2.5L Турбодизель',
    powerHp: 143,
    displacementL: 2.5,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 160,
    accelSec: 12.0,
    weightKg: 1950,
    tankCapacityL: 75,
    dimensionsM: '5.12 x 1.86 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 880000,
    availableColors: [
      { name: 'Серый титан', hex: '#475569' },
      { name: 'Черный', hex: '#020617' },
      { name: 'Хаки матовый', hex: '#3f6212' },
      { name: 'Белый', hex: '#f8fafc' }
    ],
    descriptionRu: 'Надежный двухкабинный грузопассажирский пикап с подключаемым полным приводом и вместительной кузовной платформой.'
  },
  {
    id: 'deal_hatch_hot',
    type: 'hatch_hot',
    name: 'Заряженный Хот-Хэтч GT',
    nameRu: 'Заряженный Хот-Хэтч GT',
    brand: 'Спорт',
    classType: 'Спортивный хэтчбек',
    year: 2021,
    engineSpec: '2.0L Turbo 220 л.с.',
    powerHp: 220,
    displacementL: 2.0,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 240,
    accelSec: 6.2,
    weightKg: 1280,
    tankCapacityL: 50,
    dimensionsM: '4.20 x 1.79 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 980000,
    availableColors: [
      { name: 'Ядовито-желтый', hex: '#eab308' },
      { name: 'Алый металлик', hex: '#dc2626' },
      { name: 'Кобальт', hex: '#2563eb' },
      { name: 'Тюнинг-черный', hex: '#09090b' }
    ],
    descriptionRu: 'Динамичный турбированный хэтчбек со спортивной подвеской, усиленными тормозами и острым рулевым управлением.'
  },
  {
    id: 'deal_van',
    type: 'van',
    name: 'Бизнес-фургон',
    nameRu: 'Бизнес-фургон',
    brand: 'Transporter',
    classType: 'Бизнес-вэн / Фургон',
    year: 2022,
    engineSpec: '2.0L TDI Дизель',
    powerHp: 150,
    displacementL: 2.0,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 165,
    accelSec: 12.8,
    weightKg: 2150,
    tankCapacityL: 75,
    dimensionsM: '5.30 x 2.05 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 1250000,
    availableColors: [
      { name: 'Белоснежный', hex: '#ffffff' },
      { name: 'Серебристый металлик', hex: '#cbd5e1' },
      { name: 'Глубокий синий', hex: '#1e3a8a' },
      { name: 'Бизнес-черный', hex: '#1e293b' }
    ],
    descriptionRu: 'Вместительный и стильный бизнес-фургон с аэродинамичным кузовом, боковой сдвижной дверью, распашными задними дверями и комфортным салоном.'
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  world: GameWorld | null;
  dealershipX?: number;
  dealershipY?: number;
}

export const CarDealershipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  player,
  world,
  dealershipX = 82,
  dealershipY = 5704
}) => {
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [transmissionMode, setTransmissionMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentCar = DEALERSHIP_CARS[selectedCarIndex] || DEALERSHIP_CARS[0];
  const currentColor = currentCar.availableColors[selectedColorIndex] || currentCar.availableColors[0];

  // Auto fallback transmission mode if selected car doesn't support manual
  useEffect(() => {
    if (!currentCar.hasManualTrans && currentCar.hasAutoTrans) {
      setTransmissionMode('AUTO');
    } else if (!currentCar.hasAutoTrans && currentCar.hasManualTrans) {
      setTransmissionMode('MANUAL');
    }
    setSelectedColorIndex(0);
  }, [selectedCarIndex]);

  // Render top-down live preview of vehicle on Canvas using true in-game vehicle graphics engine
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const config = CAR_CONFIGS[currentCar.type] || CAR_CONFIGS.sedan;
    const scale = Math.min(canvas.width / (config.length * 1.65), canvas.height / (config.width * 2.8));
    
    // UNSCALED logical game units for the graphics engine
    const halfL = config.length / 2;
    const halfW = config.width / 2;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);

    // Draw showroom rotating pedestal platform
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.44, halfW * 3.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2 / scale;
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.40, halfW * 3.0, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Create dummy Vehicle object for in-game render engine
    const dummyCar = {
      id: 'preview',
      type: currentCar.type,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      angle: 0,
      steerAngle: 0,
      targetSteerAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      angularVelocity: 0,
      mass: config.mass,
      length: config.length,
      width: config.width,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: currentColor.roofHex || currentColor.hex,
      headlightsOn: true,
      headlightMode: 'low_beam',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      isLocked: true,
      ownerId: 'player',
      isParked: true,
      isPlayerControlled: false,
      targetSpeed: 0,
      currentLaneId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      aiState: 'parked',
      requiredFuel: currentCar.fuelType === 'diesel' ? 'diesel' : (currentCar.fuelType === 'ai92' ? 'ai92' : 'ai95'),
      damage: createDefaultVehicleDamage(config.length, config.width)
    } as unknown as Vehicle;

    // 1. Drop Shadow under vehicle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.05, halfW * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wheels - Tucked realistically inside wheel wells BEFORE drawing body shell
    const isSport = dummyCar.type === 'sports' || dummyCar.type === 'supercar' || dummyCar.type === 'coupe_gt' || dummyCar.type === 'hatch_hot';
    const isMicro = dummyCar.type === 'micro_car' || dummyCar.type === 'retro_bubble';
    const isOffroadHeavy = dummyCar.type === 'offroad_hardcore' || dummyCar.type === 'suv_classic_box';

    const wheelL = isSport ? 10.5 : (isMicro ? 7.6 : 9.5);
    const wheelW = isSport ? 5.8 : (isMicro ? 3.4 : (isOffroadHeavy ? 4.8 : 4.2));
    const frontAxleX = dummyCar.type === 'supercar' ? halfL * 0.68 : halfL * 0.65;
    const rearAxleX = -halfL * 0.65;
    const trackY = halfW - 0.8;

    const renderFixedWheel = (wx: number, wy: number) => {
      ctx.fillStyle = '#0f172a'; // Tire
      ctx.fillRect(wx - wheelL / 2, wy, wheelL, wheelW);
      ctx.fillStyle = isSport ? '#cbd5e1' : '#64748b'; // Rims
      ctx.fillRect(wx - wheelL / 2 + 2, wy + 0.8, wheelL - 4, wheelW - 1.6);
    };

    // Standard 4-wheel passenger car layout (wheels under body/fenders)
    renderFixedWheel(rearAxleX, -trackY);
    renderFixedWheel(rearAxleX, trackY - wheelW);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(frontAxleX - wheelL / 2, -trackY, wheelL, wheelW);
    ctx.fillRect(frontAxleX - wheelL / 2, trackY - wheelW, wheelL, wheelW);
    ctx.fillStyle = isSport ? '#cbd5e1' : '#64748b';
    ctx.fillRect(frontAxleX - wheelL / 2 + 2, -trackY + 0.8, wheelL - 4, wheelW - 1.6);
    ctx.fillRect(frontAxleX - wheelL / 2 + 2, trackY - wheelW + 0.8, wheelL - 4, wheelW - 1.6);

    // 3. Body Shell (Rendered ON TOP of wheels with smooth softbody spline)
    const basePoly = getVehicleBasePolygon(dummyCar, halfL, halfW, 0, 0, 0, 0, 0, 0, 0, 0);
    ctx.fillStyle = dummyCar.color;
    ctx.beginPath();
    traceSoftbodyPath(ctx, basePoly);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Softbody metallic stress highlights and ambient crease shadow lines
    renderSoftbodyStressLines(ctx, basePoly);

    // Front bumper grille (only for standard production models without bespoke fascias)
    const hasCustomGrille = dummyCar.type === 'sedan_classic' || dummyCar.type === 'sedan_luxury' || 
                            dummyCar.type === 'classic_compact' || dummyCar.type === 'retro_bubble' || 
                            dummyCar.type === 'suv_classic_box' || dummyCar.type === 'van' || 
                            dummyCar.type === 'van_cargo_old' || dummyCar.type === 'delivery_truck' ||
                            dummyCar.type === 'van_camper' || dummyCar.type === 'hatch_hot' ||
                            dummyCar.type === 'police' || dummyCar.type === 'sports' || dummyCar.type === 'supercar';
    if (!hasCustomGrille) {
      const grilleW = Math.max(halfW * 1.0, halfW * 2 - 14);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(halfL - 2, -grilleW / 2, 1.5, grilleW);
    }

    // 4. In-Game Headlights (Accurate size & placement with subtle chrome bezels)
    const leftLampX = halfL - 3.2;
    const leftLampY = -halfW + 3.2;
    const rightLampX = halfL - 3.2;
    const rightLampY = halfW - 3.2;

    const drawHeadlight = (lx: number, ly: number) => {
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(lx, ly, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };

    drawHeadlight(leftLampX, leftLampY);
    drawHeadlight(rightLampX, rightLampY);

    // 5. In-Game Taillights (Rectangular lenses matching in-game renderer)
    const rearLeftX = -halfL + 2.5;
    const rearLeftY = -halfW + 3.2;
    const rearRightX = -halfL + 2.5;
    const rearRightY = halfW - 3.2;

    const drawTaillight = (rx: number, ry: number) => {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rx - 1, ry - 1, 2, 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(rx - 1, ry - 1, 2, 2);
    };

    drawTaillight(rearLeftX, rearLeftY);
    drawTaillight(rearRightX, rearRightY);

    // 6. Cabin, Greenhouse, Roof, Window Pillars & Specialized Attachments
    const cabinDim = getVehicleCabinDimensions(dummyCar, halfL, halfW, 0, 0);
    const deformFunc = (x: number, y: number): [number, number] => [x, y];
    
    const drawDeformedRect = (x: number, y: number, w: number, h: number, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    
    const drawDeformedLine = (x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    
    const drawDeformedCircle = (cx: number, cy: number, r: number, fill: string, stroke?: string, lineWidth = 1) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const vCtx: VehicleRenderContext = {
      ctx,
      car: dummyCar,
      halfL,
      halfW,
      fc: 0,
      rc: 0,
      cabinX: cabinDim.cabinX,
      cabinL: cabinDim.cabinL,
      cabinW: cabinDim.cabinW,
      deform: deformFunc,
      drawDeformedRect,
      drawDeformedLine,
      drawDeformedCircle,
      nightAlpha: 0.1
    };

    renderVehicleGreenhouseAndBodyPanels(vCtx);
    renderSpecializedVehicleAttachments(vCtx);

    ctx.restore();
  }, [isOpen, selectedCarIndex, selectedColorIndex]);

  if (!isOpen) return null;

  const playerCash = getPlayerCash(player);
  const canAfford = playerCash >= currentCar.priceRub;

  const handleBuy = () => {
    if (!player || !world) return;

    if (!canAfford) {
      sound.playAlert();
      return;
    }

    const deducted = deductPlayerCash(player, currentCar.priceRub);
    if (!deducted) {
      sound.playAlert();
      return;
    }

    // Spawn Vehicle on designated Delivery Bay in front of Dealership main entrance
    const config = CAR_CONFIGS[currentCar.type] || CAR_CONFIGS.sedan;
    const newVehId = `player_car_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const baseSpawnX = 252;
    const baseSpawnY = 5970;
    let spawnX = baseSpawnX;
    let spawnY = baseSpawnY;

    if (world?.vehicles) {
      const isOccupied = (x: number, y: number) => 
        world.vehicles.some(v => Math.hypot(v.x - x, v.y - y) < 32);
      
      const candidateOffsets = [
        [0, 0],
        [46, 0],
        [-46, 0],
        [92, 0],
        [-92, 0],
        [0, 52],
        [46, 52],
        [-46, 52]
      ];
      for (const [ox, oy] of candidateOffsets) {
        if (!isOccupied(baseSpawnX + ox, baseSpawnY + oy)) {
          spawnX = baseSpawnX + ox;
          spawnY = baseSpawnY + oy;
          break;
        }
      }
    }

    const newVeh: Vehicle = {
      id: newVehId,
      type: currentCar.type,
      x: spawnX,
      y: spawnY,
      vx: 0,
      vy: 0,
      angle: Math.PI / 2,
      steerAngle: 0,
      targetSteerAngle: 0,
      speed: 0,
      lateralVelocity: 0,
      angularVelocity: 0,
      isDrifting: false,
      driftFactor: 0,
      mass: currentCar.weightKg,
      width: config.width,
      length: config.length,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: currentColor.roofHex || currentColor.hex,
      headlightsOn: false,
      headlightMode: 'off',
      brakeLightsOn: false,
      isReversing: false,
      turnSignal: 'none',
      turnSignalTimer: 0,
      isLocked: true,
      ownerId: 'player',
      isParked: true,
      isPlayerControlled: false,
      targetSpeed: 0,
      currentLaneId: null,
      targetWaypointIndex: 0,
      routeWaypoints: [],
      aiState: 'parked',
      requiredFuel: currentCar.fuelType === 'diesel' ? 'diesel' : (currentCar.fuelType === 'ai92' ? 'ai92' : 'ai95'),
      damage: createDefaultVehicleDamage(config.length, config.width),
      engineState: {
        ...createDefaultEngineState(currentCar.type, false, true),
        transmissionType: transmissionMode,
        autoGearMode: transmissionMode === 'AUTO' ? 'P' : undefined,
        currentGear: 0
      },
      fuelSystem: {
        ...createDefaultFuelSystem(currentCar.type, false),
        tankLevel: 100,
        tankCapacity: currentCar.tankCapacityL,
        fuelType: currentCar.fuelType === 'diesel' ? 'diesel' : (currentCar.fuelType === 'ai92' ? 'ai92' : 'ai95'),
        octaneNumber: currentCar.fuelType === 'ai92' ? 92 : (currentCar.fuelType === 'diesel' ? 45 : 95)
      }
    } as Vehicle;

    if (!world.vehicles) world.vehicles = [];
    world.vehicles.push(newVeh);

    // Create & Add Items to Player: Key, PTS, Tech Passport
    const keyItem = createItem('car_key', 1);
    keyItem.nameRu = `Ключ (${currentCar.nameRu})`;
    keyItem.vehicleId = newVehId;
    keyItem.carName = currentCar.nameRu;
    keyItem.carColor = currentColor.name;
    keyItem.descriptionRu = `Электронный ключ с пультом от авто «${currentCar.nameRu}» (${currentColor.name}). Нажмите [E] с ключом в руках для разблокировки/блокировки ЦЗ.`;

    const ptsItem = createItem('car_pts', 1);
    ptsItem.nameRu = `ПТС — ${currentCar.nameRu}`;
    ptsItem.descriptionRu = `Паспорт ТС № ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(100000 + Math.random() * 900000)}. Владелец: Гражданин. Год: ${currentCar.year}, Мощность: ${currentCar.powerHp} л.с.`;

    const stsItem = createItem('car_tech_passport', 1);
    stsItem.nameRu = `Техпаспорт (СТС) — ${currentCar.nameRu}`;
    stsItem.descriptionRu = `Свидетельство о регистрации ТС. Госномер: ${['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'][Math.floor(Math.random()*12)]}${Math.floor(100+Math.random()*900)}${['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'][Math.floor(Math.random()*12)]}${['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'][Math.floor(Math.random()*12)]} 777`;

    const tryAddItem = (item: any) => {
      const added = addItemToPlayer(player, item);
      if (!added && world) {
        if (!world.groundItems) world.groundItems = [];
        const angle = player.angle || 0;
        world.groundItems.push({
          id: `ground_dealership_${Date.now()}_${Math.random()}`,
          x: player.x + Math.cos(angle) * 15,
          y: player.y + Math.sin(angle) * 15,
          item: item,
          spawnTime: Date.now()
        });
      }
    };

    tryAddItem(keyItem);
    tryAddItem(ptsItem);
    tryAddItem(stsItem);

    sound.playBuySell();
    setPurchaseSuccessMessage(`🎉 Поздравляем с покупкой ${currentCar.nameRu}! Автомобиль ожидает вас на площадке выдачи у главного входа автосалона. В инвентарь добавлены: Ключ с пультом ЦЗ, ПТС и СТС.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Автосалон «Премиум Моторс»
              </h2>
              <p className="text-xs text-slate-400">
                Новые и проверенные автомобили с гарантией и оформлением документов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-emerald-950/80 border border-emerald-600/50 rounded-lg text-right">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-semibold">Ваш баланс:</span>
              <span className="text-lg font-extrabold text-emerald-300">{playerCash.toLocaleString('ru-RU')} ₽</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {purchaseSuccessMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-700 px-6 py-3 flex items-center justify-between text-sm text-emerald-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span>🎉</span>
              <span>{purchaseSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPurchaseSuccessMessage(null)}
              className="text-emerald-400 hover:text-white font-bold text-xs bg-emerald-900/60 px-2.5 py-1 rounded hover:bg-emerald-800"
            >
              Понятно
            </button>
          </div>
        )}

        {/* Modal Main Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Car Catalog List */}
          <div className="md:col-span-4 border-r border-slate-800 bg-slate-950/40 overflow-y-auto p-3 space-y-2">
            <div className="px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Выбор модели ({DEALERSHIP_CARS.length}):
            </div>
            {DEALERSHIP_CARS.map((car, idx) => {
              const isSelected = idx === selectedCarIndex;
              return (
                <button
                  key={car.id}
                  onClick={() => {
                    setSelectedCarIndex(idx);
                    setPurchaseSuccessMessage(null);
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">{car.brand}</span>
                      <h3 className="font-bold text-slate-100 text-sm">{car.nameRu}</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                      {car.priceRub.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">{car.classType}</span>
                    <span>•</span>
                    <span>{car.year} г.</span>
                    <span>•</span>
                    <span className="text-amber-300">{car.fuelTypeLabel}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Car Details & Customization */}
          <div className="md:col-span-8 overflow-y-auto p-6 flex flex-col gap-6 bg-slate-900">
            
            {/* Top Showcase: Live Canvas & High-level Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              
              {/* Canvas Preview */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center bg-slate-900/80 rounded-xl p-3 border border-slate-800">
                <canvas
                  ref={canvasRef}
                  width={220}
                  height={150}
                  className="w-full h-[150px] object-contain drop-shadow-xl"
                />
                <span className="text-[10px] text-slate-400 mt-2 font-mono">Вид сверху (Визуализация в реальном времени)</span>
              </div>

              {/* Title & Price Card */}
              <div className="sm:col-span-7 flex flex-col gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{currentCar.brand}</span>
                  <h2 className="text-2xl font-extrabold text-white">{currentCar.nameRu}</h2>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">{currentCar.descriptionRu}</p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="text-2xl font-black text-emerald-400">
                    {currentCar.priceRub.toLocaleString('ru-RU')} ₽
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                    canAfford
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}>
                    {canAfford ? 'Доступно к покупке' : 'Недостаточно средств'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customization Options: Color & Transmission */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Color Selector */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Заводской цвет кузова:
                </label>
                <div className="text-sm font-semibold text-blue-300 mb-3">
                  {currentColor.name}
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {currentCar.availableColors.map((col, cIdx) => (
                    <button
                      key={col.name}
                      onClick={() => setSelectedColorIndex(cIdx)}
                      title={col.name}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-md ${
                        cIdx === selectedColorIndex ? 'border-blue-400 scale-110 ring-2 ring-blue-500/50' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: col.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Transmission Selector */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                  Коробка передач:
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    disabled={!currentCar.hasManualTrans}
                    onClick={() => setTransmissionMode('MANUAL')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                      transmissionMode === 'MANUAL'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    } ${!currentCar.hasManualTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span>МКПП (Механика)</span>
                    <span className="text-[10px] font-normal opacity-80">5-ступенчатая</span>
                  </button>

                  <button
                    disabled={!currentCar.hasAutoTrans}
                    onClick={() => setTransmissionMode('AUTO')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                      transmissionMode === 'AUTO'
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    } ${!currentCar.hasAutoTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span>АКПП (Автомат)</span>
                    <span className="text-[10px] font-normal opacity-80">Гидротрансформатор</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Detailed Vehicle Specifications Table */}
            <div className="bg-slate-950/40 rounded-xl border border-slate-800/80 p-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                Технические характеристики и паспортные данные:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Год выпуска</span>
                  <span className="font-bold text-slate-200">{currentCar.year} г.</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Двигатель</span>
                  <span className="font-bold text-slate-200 truncate block">{currentCar.engineSpec}</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Мощность</span>
                  <span className="font-bold text-emerald-400">{currentCar.powerHp} л.с.</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Тип топлива</span>
                  <span className="font-bold text-amber-300">{currentCar.fuelTypeLabel}</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Макс. скорость</span>
                  <span className="font-bold text-slate-200">{currentCar.topSpeedKmh} км/ч</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Разгон 0-100 км/ч</span>
                  <span className="font-bold text-slate-200">{currentCar.accelSec} сек.</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Снаряженная масса</span>
                  <span className="font-bold text-slate-200">{currentCar.weightKg} кг</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Объем бака</span>
                  <span className="font-bold text-slate-200">{currentCar.tankCapacityL} литров</span>
                </div>

                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Габариты кузова</span>
                  <span className="font-bold text-slate-200">{currentCar.dimensionsM}</span>
                </div>
              </div>
            </div>

            {/* Purchase Footer Action */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div className="text-xs text-slate-400">
                При покупке вы автоматически получаете:<br />
                <span className="text-slate-300 font-semibold">• Брелок ключа с пультом ЦЗ, ПТС и Техпаспорт (СТС)</span>
              </div>

              <button
                disabled={!canAfford}
                onClick={handleBuy}
                className={`px-6 py-3 rounded-xl font-extrabold text-sm transition-all shadow-lg flex items-center gap-2 ${
                  canAfford
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <span>🔑</span>
                <span>Купить за {currentCar.priceRub.toLocaleString('ru-RU')} ₽</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { CarType, Vehicle, Player, GameWorld } from '../types';
import { CAR_CONFIGS, createDefaultEngineState, createDefaultFuelSystem, createDefaultVehicleDamage, isRoadMachinery } from '../vehicleHelpers';
import { 
  getVehicleBasePolygon, 
  getVehicleCabinDimensions, 
  renderVehicleGreenhouseAndBodyPanels, 
  renderSpecializedVehicleAttachments, 
  VehicleRenderContext 
} from '../vehicleVisuals';
import { traceSoftbodyPath, renderSoftbodyStressLines } from '../softbodyVisuals';
import { getPlayerCash, deductPlayerCash, createItem, addItemToPlayer, getCarKeyTier, getCarKeyFeatures, getVehicleRequiredKeyType, addPlayerNotification } from '../items';
import { sound } from '../audio';
import { Car, Sparkles, Clock, Coins, CheckCircle2, X } from 'lucide-react';

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
  fuelType: 'ai92'| 'ai95'| 'diesel';
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
    id: 'deal_liftback_tavria',
    type: 'liftback_tavria',
    name: 'ЗАЗ-1102 «Таврия» (1.1L МеМЗ)',
    nameRu: 'ЗАЗ-1102 «Таврия»',
    brand: 'ЗАЗ',
    classType: 'Ультрабюджетный хэтчбек',
    year: 1998,
    engineSpec: '1.1L МеМЗ-245 Карбюратор',
    powerHp: 53,
    displacementL: 1.1,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 145,
    accelSec: 16.2,
    weightKg: 710,
    tankCapacityL: 39,
    dimensionsM: '3.70 x 1.55 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 68000,
    availableColors: [
      { name: 'Белый лебедь', hex: '#f8fafc' },
      { name: 'Океан (синий)', hex: '#1d4ed8' },
      { name: 'Коррида (ярко-красный)', hex: '#dc2626' },
      { name: 'Мурена (сине-зеленый)', hex: '#0f766e' },
      { name: 'Прима (песочный)', hex: '#ca8a04' }
    ],
    descriptionRu: 'Легкий и юркий переднеприводный автомобиль с одинарным стеклоочистителем и неприхотливым карбюратором. Вес всего 710 кг!'
  },
  {
    id: 'deal_hatch_samara',
    type: 'hatch_samara',
    name: 'ВАЗ-2109 «Самара» (Девятка)',
    nameRu: 'ВАЗ-2109 «Самара»',
    brand: 'LADA / ВАЗ',
    classType: 'Хэтчбек / B-Класс',
    year: 2002,
    engineSpec: '1.5L 8V Инжектор (ВАЗ-2111)',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 160,
    accelSec: 13.0,
    weightKg: 945,
    tankCapacityL: 43,
    dimensionsM: '4.00 x 1.65 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 120000,
    availableColors: [
      { name: 'Мокрый асфальт (темно-серый)', hex: '#334155' },
      { name: 'Снежная королева (серебро)', hex: '#cbd5e1' },
      { name: 'Вишня (темно-красный)', hex: '#991b1b' },
      { name: 'Балтика (синий металлик)', hex: '#1e40af' },
      { name: 'Белое облако', hex: '#f8fafc' },
      { name: 'Баклажан (темно-фиолетовый)', hex: '#4c1d95' }
    ],
    descriptionRu: 'Культовая пятидверная «Девятка» с клиновидным силуэтом, задним спойлером и проверенным 8-клапанным инжекторным мотором.'
  },
  {
    id: 'deal_sedan_samara',
    type: 'sedan_samara',
    name: 'ВАЗ-21099 «Самара» (99-я)',
    nameRu: 'ВАЗ-21099 «Самара»',
    brand: 'LADA / ВАЗ',
    classType: 'Седан / B-Класс',
    year: 2003,
    engineSpec: '1.5L 8V Инжектор (ВАЗ-2111)',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 165,
    accelSec: 13.2,
    weightKg: 970,
    tankCapacityL: 43,
    dimensionsM: '4.20 x 1.65 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 135000,
    availableColors: [
      { name: 'Снежная королева (серебро)', hex: '#cbd5e1' },
      { name: 'Млечный путь (графит)', hex: '#1e293b' },
      { name: 'Мурена (морская волна)', hex: '#0f766e' },
      { name: 'Рубин (красный)', hex: '#b91c1c' },
      { name: 'Опал (серебристо-голубой)', hex: '#93c5fd' }
    ],
    descriptionRu: 'Легендарный седан «Девяносто девятая» с заводским аэродинамическим спойлером на крышке багажника и вместительным отсеком.'
  },
  {
    id: 'deal_compact_matiz',
    type: 'compact_matiz',
    name: 'Субкомпактный хэтчбек (Daewoo Matiz)',
    nameRu: 'Daewoo Matiz 0.8L',
    brand: 'Daewoo',
    classType: 'A-Класс / Микролитражка',
    year: 2012,
    engineSpec: '0.8L 3-цил. SOHC (F8CV)',
    powerHp: 52,
    displacementL: 0.8,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 144,
    accelSec: 17.0,
    weightKg: 770,
    tankCapacityL: 35,
    dimensionsM: '3.49 x 1.49 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 145000,
    availableColors: [
      { name: 'Лайм (салатовый)', hex: '#84cc16' },
      { name: 'Лимонный (желтый)', hex: '#facc15' },
      { name: 'Васильковый (синий)', hex: '#2563eb' },
      { name: 'Серебристый металлик', hex: '#cbd5e1' },
      { name: 'Спелая вишня', hex: '#991b1b' },
      { name: 'Белоснежный', hex: '#ffffff' }
    ],
    descriptionRu: 'Компактный, юркий и максимально экономичный городской хэтчбек. Поместится на любой парковке, расходует минимум топлива.'
  },
  {
    id: 'deal_sedan_nexia',
    type: 'sedan_nexia',
    name: 'Daewoo Nexia 1.5L 16V (N100)',
    nameRu: 'Daewoo Nexia N100',
    brand: 'Daewoo',
    classType: 'Седан / C-Класс',
    year: 2007,
    engineSpec: '1.5L 16V DOHC (A15MF)',
    powerHp: 85,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 172,
    accelSec: 12.2,
    weightKg: 1020,
    tankCapacityL: 50,
    dimensionsM: '4.48 x 1.66 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 160000,
    availableColors: [
      { name: 'Серебристый металлик', hex: '#cbd5e1' },
      { name: 'Темно-синий океан', hex: '#1e3a8a' },
      { name: 'Золотистый песок', hex: '#d97706' },
      { name: 'Гранат (бордовый)', hex: '#881337' },
      { name: 'Белый лак', hex: '#f8fafc' }
    ],
    descriptionRu: 'Проверенный временем комфортный седан с гигантским 530-литровым багажником, мягкой подвеской и выносливым 16-клапанным мотором.'
  },
  {
    id: 'deal_sedan_accent',
    type: 'sedan_accent',
    name: 'Hyundai Accent 1.5L 16V (TagAZ)',
    nameRu: 'Hyundai Accent II',
    brand: 'Hyundai',
    classType: 'Городской седан / B-Класс',
    year: 2008,
    engineSpec: '1.5L 16V DOHC (G4EC, 102 л.с.)',
    powerHp: 102,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 180,
    accelSec: 10.5,
    weightKg: 1030,
    tankCapacityL: 45,
    dimensionsM: '4.23 x 1.67 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 270000,
    availableColors: [
      { name: 'Серебристый кварц', hex: '#cbd5e1' },
      { name: 'Черный обсидиан', hex: '#0f172a' },
      { name: 'Темно-синий сапфир', hex: '#1e3a8a' },
      { name: 'Рубиновый гранат', hex: '#991b1b' },
      { name: 'Чистый белый', hex: '#ffffff' }
    ],
    descriptionRu: 'Надежный, приемистый и мягкий седан с независимой задней многорычажной подвеской и 102-сильным мотором.'
  },
  {
    id: 'deal_sedan_logan',
    type: 'sedan_logan',
    name: 'Renault Logan I 1.6L (Неубиваемый)',
    nameRu: 'Renault Logan I',
    brand: 'Renault',
    classType: 'Бюджетный седан / B-Класс',
    year: 2011,
    engineSpec: '1.6L 8V K7M (87 л.с.)',
    powerHp: 87,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 175,
    accelSec: 11.5,
    weightKg: 980,
    tankCapacityL: 50,
    dimensionsM: '4.29 x 1.74 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 295000,
    availableColors: [
      { name: 'Светлый базальт (бежевый металлик)', hex: '#d4c5b9' },
      { name: 'Ледниковый белый', hex: '#f8fafc' },
      { name: 'Черная жемчужина', hex: '#0f172a' },
      { name: 'Синий минерал', hex: '#1d4ed8' },
      { name: 'Серая платина (серебро)', hex: '#94a3b8' }
    ],
    descriptionRu: 'Легенда таксопарков и дачников. Непробиваемая энергоемкая подвеска, высокий клиренс и просторный салон.'
  },
  {
    id: 'deal_sedan_polo',
    type: 'sedan_polo',
    name: 'Volkswagen Polo Sedan 1.6L MPI',
    nameRu: 'Volkswagen Polo Sedan',
    brand: 'Volkswagen',
    classType: 'Седан B+ / Комфорт',
    year: 2016,
    engineSpec: '1.6L 16V MPI CWVA (110 л.с.)',
    powerHp: 110,
    displacementL: 1.6,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 191,
    accelSec: 10.4,
    weightKg: 1160,
    tankCapacityL: 55,
    dimensionsM: '4.39 x 1.70 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 520000,
    availableColors: [
      { name: 'Candy White (Белый)', hex: '#ffffff' },
      { name: 'Urano Grey (Серый)', hex: '#475569' },
      { name: 'Reflex Silver (Серебристый)', hex: '#cbd5e1' },
      { name: 'Deep Black (Черный перламутр)', hex: '#0f172a' },
      { name: 'Toffee Brown (Коричневый)', hex: '#78350f' }
    ],
    descriptionRu: 'Строгий немецкий дизайн, выверенная эргономика, надежный 110-сильный мотор 1.6 MPI и отличная курсовая устойчивость.'
  },
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
      { name: 'Белое облако (240)', hex: '#f8fafc'},
      { name: 'Черный жемчуг (676)', hex: '#0f172a'},
      { name: 'Борнео (серебро)', hex: '#94a3b8'},
      { name: 'Платина (691)', hex: '#cbd5e1'},
      { name: 'Кориандр (золотистый)', hex: '#d97706'}
    ],
    descriptionRu: 'Самый популярный народный седан. Недорогой в обслуживании, экономичный двигатель 1.6L, выбор МКПП или АКПП.'},
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
      { name: 'Сердолик (красный)', hex: '#dc2626'},
      { name: 'Дайвинг (синий)', hex: '#2563eb'},
      { name: 'Ледниковый белый', hex: '#ffffff'},
      { name: 'Плутон (темно-серый)', hex: '#334155'}
    ],
    descriptionRu: 'Современный городской седан с высоким клиренсом, вместительным багажником и современными системами безопасности.'},
  {
    id: 'deal_wagon_modern',
    type: 'wagon_modern',
    name: 'Современный Универсал',
    nameRu: 'Современный Универсал',
    brand: 'СитиАвто',
    classType: 'Универсал',
    year: 2022,
    engineSpec: '1.8L 16V 122 л.с.',
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
      { name: 'Марс (оранжевый)', hex: '#ea580c'},
      { name: 'Карфаген (серебристый)', hex: '#e2e8f0'},
      { name: 'Анкор (черный металлик)', hex: '#1e293b'},
      { name: 'Амазонка (зеленый)', hex: '#166534'}
    ],
    descriptionRu: 'Вместительный семейный универсал с рейлингами на крыше, огромным багажником и практичным салоном.'},
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
      { name: 'Оранжевый хаки', hex: '#f97316'},
      { name: 'Темный изумруд', hex: '#065f46'},
      { name: 'Перламутр белый', hex: '#f8fafc'},
      { name: 'Мокрый асфальт', hex: '#475569'}
    ],
    descriptionRu: 'Полноприводный кроссовер с отличной проходимостью, высокими колесными арками и надежным автоматом.'},
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
      { name: 'Ярко-красный', hex: '#ef4444'},
      { name: 'Синий перламутр', hex: '#3b82f6'},
      { name: 'Белый', hex: '#ffffff'},
      { name: 'Серый графит', hex: '#64748b'}
    ],
    descriptionRu: 'Компактный 5-дверный хэтчбек. Удобен для парковки в тесных городских дворах и маневрирования в потоке.'},
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
      { name: 'Защитный хаки', hex: '#3f6212'},
      { name: 'Темно-зеленый', hex: '#14532d'},
      { name: 'Белый снег', hex: '#f8fafc'},
      { name: 'Несси (темно-синий)', hex: '#1e3a8a'}
    ],
    descriptionRu: 'Легендарный компактный полноприводный внедорожник с честным 4x4, понижающей передачей и блокировкой межосевого дифференциала.'},
  {
    id: 'deal_suv_luxury',
    type: 'suv_luxury',
    name: 'Рамный Люкс Внедорожник',
    nameRu: 'Рамный Люкс Внедорожник',
    brand: 'Внедорожник',
    classType: 'Рамный SUV',
    year: 2022,
    engineSpec: '2.7L PRO 150 л.с.',
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
      { name: 'Черный металлик', hex: '#020617'},
      { name: 'Серый металлик (Астероид)', hex: '#475569'},
      { name: 'Белый перламутр', hex: '#ffffff'},
      { name: 'Темно-зеленый', hex: '#166534'}
    ],
    descriptionRu: 'Флагманский рамный внедорожник с автоматической коробкой передач, кожаным салоном и мультимедиа.'},
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
      { name: 'Черный обсидиан', hex: '#0f172a'},
      { name: 'Серебристый металлик', hex: '#e2e8f0'},
      { name: 'Темно-синий перламутр', hex: '#1e3a8a'},
      { name: 'Белый перламутр', hex: '#f8fafc'}
    ],
    descriptionRu: 'Комфортабельный премиальный седан с мягкой подвеской, климат-контролем и 6-ступенчатым автоматом.'},
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
      { name: 'Серый титан', hex: '#475569'},
      { name: 'Черный', hex: '#020617'},
      { name: 'Хаки матовый', hex: '#3f6212'},
      { name: 'Белый', hex: '#f8fafc'}
    ],
    descriptionRu: 'Надежный двухкабинный грузопассажирский пикап с подключаемым полным приводом и вместительной кузовной платформой.'},
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
      { name: 'Ядовито-желтый', hex: '#eab308'},
      { name: 'Алый металлик', hex: '#dc2626'},
      { name: 'Кобальт', hex: '#2563eb'},
      { name: 'Тюнинг-черный', hex: '#09090b'}
    ],
    descriptionRu: 'Динамичный турбированный хэтчбек со спортивной подвеской, усиленными тормозами и острым рулевым управлением.'},
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
      { name: 'Белоснежный', hex: '#ffffff'},
      { name: 'Серебристый металлик', hex: '#cbd5e1'},
      { name: 'Глубокий синий', hex: '#1e3a8a'},
      { name: 'Бизнес-черный', hex: '#1e293b'}
    ],
    descriptionRu: 'Вместительный и стильный бизнес-фургон с аэродинамичным кузовом, боковой сдвижной дверью, распашными задними дверями и комфортным салоном.'},
  {
    id: 'deal_sedan_classic',
    type: 'sedan_classic',
    name: 'Классический Седан B-100',
    nameRu: 'Классический Седан B-100',
    brand: 'АвтоКлассика',
    classType: 'Классика B-Класса',
    year: 2011,
    engineSpec: '1.6L Инжектор 74 л.с.',
    powerHp: 74,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 150,
    accelSec: 14.5,
    weightKg: 1060,
    tankCapacityL: 39,
    dimensionsM: '4.14 x 1.62 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 180000,
    availableColors: [
      { name: 'Вишня (127)', hex: '#881337'},
      { name: 'Мурена (сине-зеленый)', hex: '#0f766e'},
      { name: 'Балтика (темно-синий)', hex: '#1e3a8a'},
      { name: 'Белое облако', hex: '#f8fafc'},
      { name: 'Яшма (темно-красный)', hex: '#9f1239'}
    ],
    descriptionRu: 'Народная классическая модель. Задний привод, простая и надежная конструкция, доступные запчасти на каждом углу.'},
  {
    id: 'deal_classic_compact',
    type: 'classic_compact',
    name: 'Компактный Хэтчбек H-210',
    nameRu: 'Компактный Хэтчбек H-210',
    brand: 'СитиАвто',
    classType: 'Компактный хэтчбек',
    year: 2004,
    engineSpec: '1.5L 8V Инжектор 78 л.с.',
    powerHp: 78,
    displacementL: 1.5,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 156,
    accelSec: 13.2,
    weightKg: 945,
    tankCapacityL: 43,
    dimensionsM: '4.00 x 1.65 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 220000,
    availableColors: [
      { name: 'Мокрый асфальт (626)', hex: '#475569'},
      { name: 'Игуана (металлик)', hex: '#15803d'},
      { name: 'Валюта (серебристый)', hex: '#cbd5e1'},
      { name: 'Черный жемчуг', hex: '#09090b'}
    ],
    descriptionRu: 'Культовый переднеприводный хэтчбек. Легкий, маневренный в городском потоке и отлично знакомый автолюбителям.'},
  {
    id: 'deal_wagon_classic',
    type: 'wagon_classic',
    name: 'Классический Универсал W-210',
    nameRu: 'Классический Универсал W-210',
    brand: 'СитиАвто',
    classType: 'Семейный универсал',
    year: 2008,
    engineSpec: '1.6L 16V 89 л.с.',
    powerHp: 89,
    displacementL: 1.6,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 165,
    accelSec: 12.5,
    weightKg: 1040,
    tankCapacityL: 43,
    dimensionsM: '4.28 x 1.68 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 210000,
    availableColors: [
      { name: 'Снежная королева (690)', hex: '#e2e8f0'},
      { name: 'Гранат (бордовый)', hex: '#991b1b'},
      { name: 'Франкония (темно-вишневый)', hex: '#831843'},
      { name: 'Кристалл (темно-серый)', hex: '#334155'}
    ],
    descriptionRu: 'Практичный семейный универсал с большой задней дверью. Незаменимый помощник для поездок на дачу и перевозки багажа.'},
  {
    id: 'deal_micro_car',
    type: 'micro_car',
    name: 'Городская Микролитражка К-750',
    nameRu: 'Городская Микролитражка К-750',
    brand: 'МикроАвто',
    classType: 'Микролитражка',
    year: 2006,
    engineSpec: '0.75L 2-цил 33 л.с.',
    powerHp: 33,
    displacementL: 0.75,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 130,
    accelSec: 18.0,
    weightKg: 645,
    tankCapacityL: 30,
    dimensionsM: '3.20 x 1.42 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 140000,
    availableColors: [
      { name: 'Васильковый (синий)', hex: '#2563eb'},
      { name: 'Сочный лимон (желтый)', hex: '#eab308'},
      { name: 'Салатовый (зеленый)', hex: '#16a34a'},
      { name: 'Белоснежный', hex: '#ffffff'}
    ],
    descriptionRu: 'Суперкомпактная микролитражка с мизерным расходом топлива. Идеальна для узких переулков и минимальных расходов.'},
  {
    id: 'deal_suv_classic_box',
    type: 'suv_classic_box',
    name: 'Внедорожник Эксплорер 4x4',
    nameRu: 'Внедорожник Эксплорер 4x4',
    brand: 'Вездеход',
    classType: 'Рамный утилитарный 4x4',
    year: 2021,
    engineSpec: '2.7L 112 л.с.',
    powerHp: 112,
    displacementL: 2.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 140,
    accelSec: 16.5,
    weightKg: 1845,
    tankCapacityL: 70,
    dimensionsM: '4.10 x 1.73 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 520000,
    availableColors: [
      { name: 'Защитный хаки (армейский)', hex: '#3f6212'},
      { name: 'Белая ночь', hex: '#f8fafc'},
      { name: 'Черный металлик', hex: '#09090b'},
      { name: 'Темно-зеленый (лесной)', hex: '#14532d'}
    ],
    descriptionRu: 'Настоящий рамный вездеход с подключаемым передним мостом, понижающей передачей и неразрезными мостами.'},
  {
    id: 'deal_wagon_allroad',
    type: 'wagon_allroad',
    name: 'Универсал Кросс 4WD',
    nameRu: 'Универсал Кросс 4WD',
    brand: 'СитиАвто',
    classType: 'Универсал повышенной проходимости',
    year: 2022,
    engineSpec: '1.8L 16V 122 л.с.',
    powerHp: 122,
    displacementL: 1.8,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 180,
    accelSec: 10.5,
    weightKg: 1350,
    tankCapacityL: 55,
    dimensionsM: '4.41 x 1.78 м',
    hasAutoTrans: true,
    hasManualTrans: true,
    priceRub: 720000,
    availableColors: [
      { name: 'Марс (оранжевый металлик)', hex: '#ea580c'},
      { name: 'Дайвинг (синий перламутр)', hex: '#2563eb'},
      { name: 'Сердолик (красный)', hex: '#dc2626'},
      { name: 'Платина (серебристый)', hex: '#cbd5e1'}
    ],
    descriptionRu: 'Вседорожный семейный универсал с защитным пластиковым обвесом по периметру, увеличенным клиренсом 203 мм и дисковыми тормозами.'},
  {
    id: 'deal_bus_minibus',
    type: 'bus_minibus',
    name: 'Пассажирский Маршрутный Микроавтобус (12 мест)',
    nameRu: 'Пассажирский Маршрутный Микроавтобус (12 мест)',
    brand: 'МаршрутАвто',
    classType: 'Городской микроавтобус',
    year: 2021,
    engineSpec: '2.7L 107 л.с.',
    powerHp: 107,
    displacementL: 2.7,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 135,
    accelSec: 16.0,
    weightKg: 2450,
    tankCapacityL: 64,
    dimensionsM: '5.50 x 2.07 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 820000,
    availableColors: [
      { name: 'Маршрутный желтый', hex: '#eab308'},
      { name: 'Ледниковый белый', hex: '#ffffff'},
      { name: 'Балтика (синий)', hex: '#1e3a8a'},
      { name: 'Серый металлик', hex: '#64748b'}
    ],
    descriptionRu: 'Надежный пассажирский микроавтобус. Отличное решение для регулярных городских пассажироперевозок и малого бизнеса.'},
  {
    id: 'deal_van_camper',
    type: 'van_camper',
    name: 'Туристический Кемпер 4x4',
    nameRu: 'Туристический Кемпер 4x4',
    brand: 'Вездеход',
    classType: 'Автодом / Кемпер',
    year: 2022,
    engineSpec: '2.7L PRO 150 л.с.',
    powerHp: 150,
    displacementL: 2.7,
    fuelType: 'ai95',
    fuelTypeLabel: 'АИ-95',
    topSpeedKmh: 140,
    accelSec: 15.2,
    weightKg: 2600,
    tankCapacityL: 68,
    dimensionsM: '5.20 x 2.05 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 1380000,
    availableColors: [
      { name: 'Песочный экспедиционный', hex: '#d97706'},
      { name: 'Защитный хаки', hex: '#3f6212'},
      { name: 'Ледниковый белый', hex: '#ffffff'},
      { name: 'Темно-серый граффит', hex: '#334155'}
    ],
    descriptionRu: 'Вездеходный жилой фургон для автономных путешествий: накрышный кондиционер, солнечные панели, велобагажник и маркиза.'},
  {
    id: 'deal_retro_bubble',
    type: 'retro_bubble',
    name: 'Ретро Микрокар Р-40',
    nameRu: 'Ретро Микрокар Р-40',
    brand: 'РетроАвто',
    classType: 'Винтажный микрокар',
    year: 1982,
    engineSpec: '1.2L V4 40 л.с.',
    powerHp: 40,
    displacementL: 1.2,
    fuelType: 'ai92',
    fuelTypeLabel: 'АИ-92',
    topSpeedKmh: 120,
    accelSec: 22.0,
    weightKg: 790,
    tankCapacityL: 30,
    dimensionsM: '3.73 x 1.57 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 110000,
    availableColors: [
      { name: 'Коррида (ярко-красный)', hex: '#dc2626'},
      { name: 'Бирюзовый (ретро)', hex: '#0891b2'},
      { name: 'Желтый лимон', hex: '#f59e0b'},
      { name: 'Светло-бежевый', hex: '#fef08a'}
    ],
    descriptionRu: 'Компактный ретро-автомобиль с заднемоторной компоновкой и воздушным охлаждением. Душевный классический автомобиль!'},
  {
    id: 'deal_paver_asphalt_wheeled',
    type: 'paver_asphalt_wheeled',
    name: 'Колесный асфальтоукладчик (Vögele Super 1803-3W)',
    nameRu: 'Колесный асфальтоукладчик',
    brand: 'ДорСпецТехника',
    classType: 'Асфальтоукладчик 6x4',
    year: 2021,
    engineSpec: '6.7L Cummins QSB6.7 Turbo Diesel (175 л.с.)',
    powerHp: 175,
    displacementL: 6.7,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 30,
    accelSec: 18.0,
    weightKg: 18500,
    tankCapacityL: 220,
    dimensionsM: '6.40 x 3.20 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 4800000,
    availableColors: [
      { name: 'Сигнальный желтый Vögele', hex: '#eab308' },
      { name: 'Строительный оранжевый', hex: '#ea580c' },
      { name: 'Технический серый', hex: '#475569' }
    ],
    descriptionRu: 'Высокопроизводительный колесный асфальтоукладчик с гидравлическим приемным бункером, выглаживающей плитой с уширителями и двухместным поворотным постом управления.'
  },
  {
    id: 'deal_roller_heavy_tandem',
    type: 'roller_heavy_tandem',
    name: 'Тандемный каток с ломаной рамой (Bomag BW 161 AD)',
    nameRu: 'Тандемный каток (ломаная рама)',
    brand: 'ДорСпецТехника',
    classType: 'Двухвальцовый каток 12т',
    year: 2022,
    engineSpec: '3.6L Deutz TCD 3.6 L4 Turbo Diesel (130 л.с.)',
    powerHp: 130,
    displacementL: 3.6,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 25,
    accelSec: 15.0,
    weightKg: 12500,
    tankCapacityL: 160,
    dimensionsM: '5.00 x 2.20 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 3200000,
    availableColors: [
      { name: 'Ярко-желтый Bomag', hex: '#eab308' },
      { name: 'Оранжевый Hamm', hex: '#ea580c' },
      { name: 'Технический зеленый', hex: '#15803d' }
    ],
    descriptionRu: 'Тяжелый 12-тонный двухвальцовый асфальтовый каток с шарнирно-сочлененной рамой («ломаной рамой»), системой орошения вальцев и гидростатическим приводом.'
  },
  {
    id: 'deal_roller_compact_sidewalk',
    type: 'roller_compact_sidewalk',
    name: 'Тротуарный каток с ломаной рамой (Bomag BW 90 AD)',
    nameRu: 'Тротуарный каток (ломаная рама)',
    brand: 'ДорСпецТехника',
    classType: 'Компактный тротуарный каток 2.2т',
    year: 2023,
    engineSpec: '1.7L Kubota D1703 3-цил. Дизель (25 л.с.)',
    powerHp: 25,
    displacementL: 1.7,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 22,
    accelSec: 12.0,
    weightKg: 2200,
    tankCapacityL: 40,
    dimensionsM: '2.30 x 1.10 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 1450000,
    availableColors: [
      { name: 'Сочный оранжевый Ammann', hex: '#f97316' },
      { name: 'Сигнальный желтый', hex: '#facc15' },
      { name: 'Белоснежный', hex: '#ffffff' }
    ],
    descriptionRu: 'Манёвренный тротуарный каток с шарнирной «ломаной рамой» для уплотнения асфальта на пешеходных дорожках, тротуарах, парковках и в узких дворовых проездах.'
  },
  {
    id: 'deal_roller_pneumatic',
    type: 'roller_pneumatic',
    name: 'Пневмоколесный каток (Bomag BW 24 RH / Hamm GRW)',
    nameRu: 'Пневмоколесный каток',
    brand: 'ДорСпецТехника',
    classType: 'Пневмоколесный каток 14-24т',
    year: 2020,
    engineSpec: '4.1L Deutz TCD 2012 L04 (100 л.с.)',
    powerHp: 100,
    displacementL: 4.1,
    fuelType: 'diesel',
    fuelTypeLabel: 'ДТ',
    topSpeedKmh: 28,
    accelSec: 16.0,
    weightKg: 14000,
    tankCapacityL: 200,
    dimensionsM: '5.20 x 2.20 м',
    hasAutoTrans: false,
    hasManualTrans: true,
    priceRub: 3600000,
    availableColors: [
      { name: 'Глубокий оранжевый', hex: '#ea580c' },
      { name: 'Фирменный желтый', hex: '#eab308' },
      { name: 'Шоссейный серый', hex: '#334155' }
    ],
    descriptionRu: 'Пневмоколесный дорожный каток с шахматным перекрытием 8 гладких пневмошин для идеальной финишной закатки верхнего слоя асфальтобетонного покрытия.'
  }
];

export interface UsedCarModel {
  id: string;
  type: CarType;
  name: string;
  nameRu: string;
  brand: string;
  classType: string;
  year: number;
  priceRub: number;
  engineSpec: string;
  powerHp: number;
  displacementL: number;
  fuelType: 'ai92'| 'ai95'| 'diesel';
  fuelTypeLabel: string;
  topSpeedKmh: number;
  accelSec: number;
  weightKg: number;
  tankCapacityL: number;
  dimensionsM: string;
  hasAutoTrans: boolean;
  hasManualTrans: boolean;
  color: { name: string; hex: string };
  descriptionRu: string;
  mileageKm: number;
  engineHealth: number;
  transmissionHealth: number;
  radiatorWater: number;
  radiatorPunctured: boolean;
  batteryCharge: number;
  bodyCondition: string;
  isChiptuned: boolean;
  hasGBO: boolean;
  isHeavySuspended: boolean;
}

export function generateUsedCars(count: number = 15): UsedCarModel[] {
  const possibleTypes = [
    { type: 'classic_compact', name: 'ВАЗ-2101 «Копейка»', basePrice: 45000 },
    { type: 'retro_bubble', name: 'ЗАЗ-968 «Запорожец»', basePrice: 35000 },
    { type: 'sedan_classic', name: 'ВАЗ-2107 «Семёрка»', basePrice: 75000 },
    { type: 'wagon_classic', name: 'ВАЗ-2104 «Четвёрка»', basePrice: 85000 },
    { type: 'micro_car', name: 'Ока СеАЗ-1111', basePrice: 55000 },
    { type: 'sedan_compact', name: 'Лада Гранта (B-Класс)', basePrice: 280000 },
    { type: 'hatchback', name: 'ВАЗ-2109 «Девятка»', basePrice: 65000 },
    { type: 'van_cargo_old', name: 'УАЗ-3741 «Буханка»', basePrice: 120000 },
    { type: 'offroad_hardcore', name: 'Нива 4х4 «Тайга»', basePrice: 180000 },
    { type: 'suv_classic_box', name: 'УАЗ Хантер 4x4', basePrice: 220000 },
    { type: 'tractor_mtz80_old', name: 'Трактор МТЗ-80 «Старый ветеран»', basePrice: 140000 },
    { type: 'tractor_mtz82', name: 'Трактор МТЗ-82.1 «Беларус»', basePrice: 380000 },
    { type: 'truck_flatbed', name: 'ГАЗ-53 Бортовой', basePrice: 150000 },
    { type: 'truck_covered', name: 'ГАЗ-53 Крытый (Шифер)', basePrice: 165000 },
    { type: 'truck_dump', name: 'КАМАЗ-5511 Самосвал', basePrice: 420000 },
    { type: 'sports', name: 'Спорткар GT (Убитый)', basePrice: 950000 },
    { type: 'sedan_luxury', name: 'Премиум Бизнес-Седан (Проблемный)', basePrice: 1200000 }
  ];

  const descriptions = [
    "Машина — пушка! Мотор заводится с полтычка, но коробка иногда вылетает. Кузов требует внимания.",
    "Дедушкин вариант. Стояла в сухом гараже последние 12 лет. Пробег родной, состояние достойное.",
    "Рабочая лошадка для дачи и стройки. Внешний вид боевой, местами ржавчина, но доедет куда угодно.",
    "Кузов переварен и покрашен из баллончика. Мотор бодрый, стоит спортивный выхлоп и чип-тюнинг!",
    "Продаю под восстановление или на запчасти. Аккумулятор севший, радиатор течёт, подвеска стучит.",
    "Идеальный вариант для первой машины. Простая как велосипед, чинится на коленке в поле.",
    "Продаю верного друга. Кузов гниловат, но мотор шепчет. Идеально для села или леса.",
    "Заводится, едет, тормозит (иногда). Состояние: «ещё походит». За такие деньги — подарок!",
    "Взял под проект, но перегорел. Половина запчастей в багажнике, вторая половина — в гараже.",
    "Полный фарш: дырки в полу для вентиляции, музыка через хрипящий динамик, люфт руля 45 градусов."];

  const bodyConds = [
    "Ржавые пороги, боевые царапины, сквозные дыры",
    "Отличное гаражное состояние, без ржавчины",
    "Помяты крылья, краска выгорела, следы мелких ДТП",
    "Свежеокрашен из баллончика, кузов переварен",
    "Музейный экспонат, родная краска",
    "Среднее рабочее состояние, мелкие вмятины и сколы"];

  const colors = [
    { name: 'Гнилая вишня', hex: '#6b1d1d'},
    { name: 'Защитный хаки', hex: '#3f6212'},
    { name: 'Морская волна', hex: '#0891b2'},
    { name: 'Липовый зеленый', hex: '#4d7c0f'},
    { name: 'Серый грунт', hex: '#475569'},
    { name: 'Оранжевая охра', hex: '#ea580c'},
    { name: 'Мутно-белый', hex: '#e2e8f0'},
    { name: 'Пыльно-черный', hex: '#1e293b'},
    { name: 'Старый синий', hex: '#1d4ed8'}
  ];

  const cars: UsedCarModel[] = [];

  for (let i = 0; i < count; i++) {
    const raw = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
    const config = CAR_CONFIGS[raw.type] || CAR_CONFIGS.sedan;

    // Mileage
    const mileageKm = Math.floor(15000 + Math.random() * 450000);
    const ageFactor = Math.min(1, mileageKm / 500000);

    // Health states - allow for even lower health (junk)
    let engineHealth = Math.floor(5 + Math.random() * 90); 
    let transmissionHealth = Math.floor(10 + Math.random() * 85);
    let batteryCharge = Math.floor(5 + Math.random() * 95);
    let radiatorWater = Math.floor(0 + Math.random() * 100);
    let radiatorPunctured = Math.random() < 0.35; // More likely to be punctured

    // Randomly force some cars to be "absolute junk"
    const isTotalJunk = Math.random() < 0.2; // 20% chance for a real beater
    if (isTotalJunk) {
      engineHealth = Math.floor(1 + Math.random() * 15);
      transmissionHealth = Math.floor(5 + Math.random() * 20);
      batteryCharge = Math.floor(0 + Math.random() * 15);
      radiatorWater = Math.floor(0 + Math.random() * 20);
      radiatorPunctured = true;
    }

    // Upgrades
    const rawType = raw.type || '';
    const isChiptuned = Math.random() < 0.15;
    const hasGBO = (rawType.includes('classic') || rawType === 'sedan_compact'|| rawType === 'hatchback'|| rawType === 'van_cargo_old') && Math.random() < 0.4;
    const isHeavySuspended = Math.random() < 0.1;

    // Calculate actual price
    const ageMultiplier = 1.0 - (ageFactor * 0.6);
    const engineMultiplier = 0.2 + (engineHealth / 100) * 0.8;
    const bodyMultiplier = 0.3 + (Math.random() * 0.7);

    let finalPrice = Math.round(raw.basePrice * ageMultiplier * engineMultiplier * bodyMultiplier);
    
    // Minimum price floor for "junk"
    if (finalPrice < 15000) finalPrice = 15000 + Math.floor(Math.random() * 5000);
    
    // Add value for upgrades
    if (isChiptuned) finalPrice += 15000;
    if (hasGBO) finalPrice += 20000;
    if (isHeavySuspended) finalPrice += 10000;

    // Minimum price floors
    if (rawType.startsWith('tractor_')) {
      finalPrice = Math.max(finalPrice, 60000);
    } else if (rawType.startsWith('truck_')) {
      finalPrice = Math.max(finalPrice, 80000);
    } else {
      // Allow very cheap junk cars
      finalPrice = Math.max(finalPrice, isTotalJunk ? 12000 : 25000);
    }

    const year = Math.floor(1975 + Math.random() * (2018 - 1975));
    const dIdx = Math.floor(Math.random() * descriptions.length);
    const bIdx = Math.floor(Math.random() * bodyConds.length);
    const color = colors[Math.floor(Math.random() * colors.length)];

    cars.push({
      id: `used_car_${Date.now()}_${i}_${Math.floor(Math.random()*1000)}`,
      type: raw.type as CarType,
      name: raw.name,
      nameRu: raw.name,
      brand: config.name || 'Авто',
      classType: config.name || 'Легковой автомобиль',
      year,
      priceRub: finalPrice,
      engineSpec: `${config.transmission === 'MANUAL'? 'МКПП': 'АКПП'} (Объем ${config.mass > 3000 ? '4.8L': (config.mass > 1500 ? '2.4L': '1.5L')})`,
      powerHp: Math.round(config.acceleration * 2.5),
      displacementL: config.mass > 3000 ? 4.8 : (config.mass > 1500 ? 2.4 : 1.5),
      fuelType: config.mass > 3000 || raw.type.startsWith('tractor_') ? 'diesel': 'ai92',
      fuelTypeLabel: config.mass > 3000 || raw.type.startsWith('tractor_') ? 'Дизель': 'АИ-92',
      topSpeedKmh: config.maxSpeed,
      accelSec: Math.round((100 / config.acceleration) * 4 * 10) / 10,
      weightKg: config.mass,
      tankCapacityL: config.mass > 3000 ? 150 : 45,
      dimensionsM: `${(config.length / 10).toFixed(2)} x ${(config.width / 10).toFixed(2)} м`,
      hasAutoTrans: config.transmission === 'AUTO',
      hasManualTrans: config.transmission === 'MANUAL',
      color,
      descriptionRu: descriptions[dIdx],
      mileageKm,
      engineHealth,
      transmissionHealth,
      radiatorWater,
      radiatorPunctured,
      batteryCharge,
      bodyCondition: bodyConds[bIdx],
      isChiptuned,
      hasGBO,
      isHeavySuspended
    });
  }

  return cars;
}

export let USED_CAR_CATALOG: UsedCarModel[] = [];
export let LAST_USED_CAR_UPDATE_TIME = 0;

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
  const [activeTab, setActiveTab] = useState<'new'| 'used'>('new');
  const [catalogTick, setCatalogTick] = useState<number>(0);
  const [selectedCarIndex, setSelectedCarIndex] = useState<number>(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState<number>(0);
  const [transmissionMode, setTransmissionMode] = useState<'MANUAL'| 'AUTO'>('MANUAL');
  const [purchaseSuccessMessage, setPurchaseSuccessMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Dynamic initialization/updating of used car catalog
  useEffect(() => {
    if (!isOpen) return;
    const now = Date.now();
    if (USED_CAR_CATALOG.length === 0 || now - LAST_USED_CAR_UPDATE_TIME > 5 * 60 * 1000) {
      // Generate between 15 and 25 cars for a "crowded"feel
      const count = 15 + Math.floor(Math.random() * 11);
      USED_CAR_CATALOG = generateUsedCars(count);
      LAST_USED_CAR_UPDATE_TIME = now;
      setCatalogTick(t => t + 1);
    }
  }, [isOpen]);

  const carsList = activeTab === 'new'? DEALERSHIP_CARS : USED_CAR_CATALOG;
  const currentCar = carsList[selectedCarIndex] || carsList[0] || DEALERSHIP_CARS[0];
  const currentColor = activeTab === 'new'? ((currentCar as DealershipCarModel).availableColors[selectedColorIndex] || (currentCar as DealershipCarModel).availableColors[0])
    : { name: (currentCar as any).color.name, hex: (currentCar as any).color.hex };

  // Auto fallback transmission mode if selected car doesn't support manual
  useEffect(() => {
    if (activeTab === 'used') {
      const uCar = currentCar as any;
      setTransmissionMode(uCar.hasManualTrans ? 'MANUAL': 'AUTO');
    } else {
      if (!currentCar.hasManualTrans && currentCar.hasAutoTrans) {
        setTransmissionMode('AUTO');
      } else if (!currentCar.hasAutoTrans && currentCar.hasManualTrans) {
        setTransmissionMode('MANUAL');
      }
    }
    setSelectedColorIndex(0);
  }, [selectedCarIndex, activeTab, catalogTick]);

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
      roofColor: (currentColor as any).roofHex || currentColor.hex,
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
      requiredFuel: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      damage: createDefaultVehicleDamage(config.length, config.width)
    } as unknown as Vehicle;

    // 1. Drop Shadow under vehicle
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, halfL * 1.05, halfW * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Wheels - Tucked realistically inside wheel wells BEFORE drawing body shell
    const isMachinery = isRoadMachinery(dummyCar.type);
    const isSport = dummyCar.type === 'sports'|| dummyCar.type === 'supercar'|| dummyCar.type === 'coupe_gt'|| dummyCar.type === 'hatch_hot';
    const isMicro = dummyCar.type === 'micro_car'|| dummyCar.type === 'retro_bubble';
    const isOffroadHeavy = dummyCar.type === 'offroad_hardcore'|| dummyCar.type === 'suv_classic_box';

    const wheelL = isSport ? 10.5 : (isMicro ? 7.6 : 9.5);
    const wheelW = isSport ? 5.8 : (isMicro ? 3.4 : (isOffroadHeavy ? 4.8 : 4.2));
    const frontAxleX = dummyCar.type === 'supercar'? halfL * 0.68 : halfL * 0.65;
    const rearAxleX = -halfL * 0.65;
    const trackY = halfW - 0.8;

    const renderFixedWheel = (wx: number, wy: number) => {
      ctx.fillStyle = '#0f172a'; // Tire
      ctx.fillRect(wx - wheelL / 2, wy, wheelL, wheelW);
      ctx.fillStyle = isSport ? '#cbd5e1': '#64748b'; // Rims
      ctx.fillRect(wx - wheelL / 2 + 2, wy + 0.8, wheelL - 4, wheelW - 1.6);
    };

    if (!isMachinery) {
      // Standard 4-wheel passenger car layout (wheels under body/fenders)
      renderFixedWheel(rearAxleX, -trackY);
      renderFixedWheel(rearAxleX, trackY - wheelW);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(frontAxleX - wheelL / 2, -trackY, wheelL, wheelW);
      ctx.fillRect(frontAxleX - wheelL / 2, trackY - wheelW, wheelL, wheelW);
      ctx.fillStyle = isSport ? '#cbd5e1': '#64748b';
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
      const hasCustomGrille = dummyCar.type === 'sedan_classic'|| dummyCar.type === 'sedan_luxury'|| 
                              dummyCar.type === 'classic_compact'|| dummyCar.type === 'retro_bubble'|| 
                              dummyCar.type === 'suv_classic_box'|| dummyCar.type === 'van'|| 
                              dummyCar.type === 'van_cargo_old'|| dummyCar.type === 'delivery_truck'||
                              dummyCar.type === 'van_camper'|| dummyCar.type === 'hatch_hot'||
                              dummyCar.type === 'police'|| dummyCar.type === 'sports'|| dummyCar.type === 'supercar'||
                              dummyCar.type === 'bus_minibus'|| dummyCar.type === 'wagon_allroad'|| dummyCar.type === 'wagon_classic';
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
    }

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

    if (!isMachinery) {
      renderVehicleGreenhouseAndBodyPanels(vCtx);
    }
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

    const isUsed = activeTab === 'used';
    const uCar = currentCar as any;

    const requiredKeyType = getVehicleRequiredKeyType(currentCar.type);
    let keyTier: 'display'| 'smart'| 'classic'| 'flip'= 'classic';
    let keyFeatures: ('lock'| 'unlock'| 'engine_start'| 'headlights'| 'horn')[] = [];
    let keyItemId = 'car_key';

    if (requiredKeyType === 'gold') {
      keyItemId = 'car_key_gold';
      keyTier = 'classic';
    } else if (requiredKeyType === 'iron') {
      keyItemId = 'car_key_iron';
      keyTier = 'classic';
    } else {
      keyTier = getCarKeyTier(currentCar.type, currentCar.priceRub);
      keyFeatures = getCarKeyFeatures(keyTier);
      if (keyTier === 'classic') keyItemId = 'car_key_classic';
      else if (keyTier === 'flip') keyItemId = 'car_key_flip';
      else if (keyTier === 'smart') keyItemId = 'car_key_smart';
      else if (keyTier === 'display') keyItemId = 'car_key_display';
    }

    // Pre-calculate engine state and physical damage
    const initialEngineState = {
      ...createDefaultEngineState(currentCar.type, false, true),
      transmissionType: transmissionMode,
      autoGearMode: transmissionMode === 'AUTO'? 'P': undefined,
      currentGear: 0
    };

    const initialFuelSystem = {
      ...createDefaultFuelSystem(currentCar.type, false),
      tankLevel: 100,
      tankCapacity: currentCar.tankCapacityL,
      fuelType: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      octaneNumber: currentCar.fuelType === 'ai92'? 92 : (currentCar.fuelType === 'diesel'? 45 : 95)
    };

    const initialDamage = createDefaultVehicleDamage(config.length, config.width);

    if (isUsed) {
      initialEngineState.engineHealth = uCar.engineHealth;
      initialEngineState.starterWorking = uCar.engineHealth > 15;
      initialEngineState.batteryCharge = uCar.batteryCharge;
      initialEngineState.radiatorWater = uCar.radiatorWater;
      initialEngineState.radiatorPunctured = uCar.radiatorPunctured;
      initialEngineState.mileageKm = uCar.mileageKm;
      initialEngineState.isChiptuned = uCar.isChiptuned;
      initialEngineState.isHeavySuspended = uCar.isHeavySuspended;
      initialEngineState.hasGBO = uCar.hasGBO;

      initialFuelSystem.tankLevel = Math.floor(10 + Math.random() * 50); 
      if (uCar.hasGBO) {
        initialFuelSystem.gboInstalled = true;
        initialFuelSystem.gboLevel = Math.floor(10 + Math.random() * 80);
        initialFuelSystem.gboCapacity = 50;
      }

      // Volumetrically damage/dent the vehicle body vertices based on mechanical wear
      // Only apply visible dents if health is below 85%
      const rawIntensity = (100 - uCar.engineHealth) / 100;
      const damageIntensity = uCar.engineHealth > 85 ? 0 : rawIntensity;
      
      if (damageIntensity > 0) {
        initialDamage.deformedVertices.forEach((vertex) => {
          // Probability of denting a specific vertex scales with intensity
          if (Math.random() < 0.5 * damageIntensity) {
            vertex.offsetX = (Math.random() - 0.5) * 10 * damageIntensity;
            vertex.offsetY = (Math.random() - 0.5) * 10 * damageIntensity;
            vertex.plasticStrain = Math.random() * 1.5 * damageIntensity;
          }
        });
      }
    }

    const newVeh: Vehicle = {
      id: newVehId,
      keyId: newVehId,
      keyTier: keyTier,
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
      mass: currentCar.weightKg + (isUsed && uCar.isHeavySuspended ? 150 : 0),
      width: config.width,
      length: config.length,
      wheelBase: config.wheelBase,
      color: currentColor.hex,
      roofColor: (currentColor as any).roofHex || currentColor.hex,
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
      requiredFuel: currentCar.fuelType === 'diesel'? 'diesel': (currentCar.fuelType === 'ai92'? 'ai92': 'ai95'),
      damage: initialDamage,
      engineState: initialEngineState,
      fuelSystem: initialFuelSystem,
      hasChiptuning: isUsed ? uCar.isChiptuned : false,
      hasGBO: isUsed ? uCar.hasGBO : false,
      isHeavySuspended: isUsed ? uCar.isHeavySuspended : false,
      stuckTimer: 0,
      honkTimer: 0,
      isHonking: false,
      hornEffectTimer: 0,
      inIntersection: false,
      plannedTurn: 'straight'} as Vehicle;

    if (!world.vehicles) world.vehicles = [];
    world.vehicles.push(newVeh);

    // Create & Add Items to Player: Key, PTS, Tech Passport
    const keyItem = createItem(keyItemId, 1);
    keyItem.vehicleId = newVehId;
    keyItem.keyTier = keyTier;
    keyItem.keyFeatures = keyFeatures;
    keyItem.carPrice = currentCar.priceRub;
    keyItem.carType = currentCar.type;
    keyItem.carName = currentCar.nameRu;
    keyItem.carColor = currentColor.name;

    if (requiredKeyType === 'gold') {
      keyItem.nameRu = `Золотой ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический "золотой"ключ зажигания от Вашего ретро-автомобиля «${currentCar.nameRu}» (${currentColor.name}). Вставьте в замок зажигания [E], чтобы завести мотор.`;
      keyItem.icon = '';
    } else if (requiredKeyType === 'iron') {
      keyItem.nameRu = `Железный ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический железный ключ зажигания от Вашего трактора/грузовика «${currentCar.nameRu}» (${currentColor.name}). Вставьте в замок зажигания [E], чтобы завести мотор.`;
      keyItem.icon = '';
    } else if (keyTier === 'display') {
      keyItem.nameRu = `Smart Display Key (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Интерактивный цифровой смарт-ключ с цветным дисплеем от «${currentCar.nameRu}» (${currentColor.name}). Поддерживает дистанционный автозапуск ДВС [], управление фарами [], центральный замок [] и телеметрию.`;
      keyItem.icon = '';
    } else if (keyTier === 'smart') {
      keyItem.nameRu = `Смарт-ключ (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Премиальный электронный смарт-ключ Keyless-Go от «${currentCar.nameRu}» (${currentColor.name}). Поддерживает дистанционный автозапуск [], управление фарами [] и ЦЗ [].`;
      keyItem.icon = '';
    } else if (keyTier === 'flip') {
      keyItem.nameRu = `Выкидной ключ (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Складной выкидной ключ с радиопультом ЦЗ от «${currentCar.nameRu}» (${currentColor.name}). Нажмите [E] в руках или используйте из инвентаря для отпирания/запирания.`;
      keyItem.icon = '';
    } else {
      keyItem.nameRu = `Ключ зажигания (${currentCar.nameRu})`;
      keyItem.descriptionRu = `Механический ключ зажигания со стальным лезвием от «${currentCar.nameRu}» (${currentColor.name}).`;
      keyItem.icon = '';
    }

    const letters = ['А','В','Е','К','М','Н','О','Р','С','Т','У','Х'];
    const randomLetter = () => letters[Math.floor(Math.random() * letters.length)];
    const randomDigits = (len: number) => Array.from({length: len}, () => Math.floor(Math.random() * 10)).join('');

    // Generate unique VIN based on car manufacturer
    let wmi = 'XTA'; // VAZ/Lada default
    if (currentCar.id.includes('kamaz') || currentCar.id.includes('truck') || currentCar.id.includes('dump')) wmi = 'XTC';
    else if (currentCar.id.includes('gaz') || currentCar.id.includes('gazelle') || currentCar.id.includes('sobol')) wmi = 'Z8T';
    else if (currentCar.id.includes('uaz')) wmi = 'XTT';
    else if (currentCar.id.includes('bmw') || currentCar.id.includes('mercedes') || currentCar.id.includes('audi')) wmi = 'WBA';
    const vin = `${wmi}${currentCar.id.substring(0,4).toUpperCase().padEnd(4, '0')}${currentCar.year.toString().slice(-2)}0${randomDigits(7)}`;

    const licensePlate = `${randomLetter()}${Math.floor(100 + Math.random() * 900)}${randomLetter()}${randomLetter()} 777`;
    const engineNumber = `${currentCar.powerHp > 200 ? '21127' : '21126'}-${randomDigits(7)}`;
    const ptsSeries = `77 ТР ${randomDigits(6)}`;
    const stsSeries = `99 21 ${randomDigits(6)}`;
    const dkpSeries = `ДКП-${randomDigits(6)}`;
    const ownerName = player.name || 'Иванов Иван Иванович';
    const now = new Date();
    const registrationDate = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} г.`;

    const ptsItem = {
      ...createItem('car_pts', 1),
      nameRu: `ПТС — ${currentCar.nameRu}`,
      descriptionRu: `Паспорт ТС № ${ptsSeries}. ТС: ${currentCar.nameRu}. VIN: ${vin}. Собственник: ${ownerName}.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      documentSeries: ptsSeries,
      registrationDate: registrationDate,
      issuingAuthority: 'МО ГИБДД ТНРЭР №1 ГУ МВД России по г. Москве',
      priceRub: currentCar.priceRub
    };

    const stsItem = {
      ...createItem('car_tech_passport', 1),
      nameRu: `СТС — ${currentCar.nameRu} (${licensePlate})`,
      descriptionRu: `Свидетельство о регистрации ТС № ${stsSeries}. Госномер: ${licensePlate}. VIN: ${vin}. Владелец: ${ownerName}.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      documentSeries: stsSeries,
      registrationDate: registrationDate,
      issuingAuthority: 'МО ГИБДД ТНРЭР №1 ГУ МВД России по г. Москве',
      priceRub: currentCar.priceRub
    };

    const dkpItem = {
      ...createItem('car_contract_dkp', 1),
      nameRu: `Договор купли-продажи (${currentCar.nameRu})`,
      descriptionRu: `Договор купли-продажи № ${dkpSeries}. Продавец: ООО «Премиум Моторс». Покупатель: ${ownerName}. VIN: ${vin}. Стоимость: ${currentCar.priceRub.toLocaleString('ru-RU')} ₽.`,
      vehicleVin: vin,
      vehicleName: currentCar.nameRu,
      vehicleColor: currentColor.name,
      vehicleYear: currentCar.year,
      vehiclePowerHp: currentCar.powerHp,
      engineDisplacementCc: (currentCar as any).engineDisplacementCc || 1596,
      engineNumber: engineNumber,
      bodyNumber: vin,
      licensePlate: licensePlate,
      ownerName: ownerName,
      sellerName: 'ООО «Премиум Моторс» (Автосалон)',
      documentSeries: dkpSeries,
      registrationDate: registrationDate,
      priceRub: currentCar.priceRub
    };

    const tryAddItem = (item: any, preferPockets = false) => {
      const added = addItemToPlayer(player, item, { preferPockets });
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
        addPlayerNotification(player, `Инвентарь полон! ${item.nameRu} выпал на пол.`, 'warning');
      }
    };

    tryAddItem(keyItem, false);
    tryAddItem(ptsItem, true);
    tryAddItem(stsItem, true);
    tryAddItem(dkpItem, true);

    sound.playBuySell();
    setPurchaseSuccessMessage(`Поздравляем с покупкой ${currentCar.nameRu}! Автомобиль ожидает вас на площадке выдачи у главного входа автосалона. В инвентарь добавлены: Ключ с пультом ЦЗ, ПТС, СТС и Договор купли-продажи.`);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 font-sans text-zinc-100">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-5xl max-h-[94vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-emerald-400 border border-zinc-700/50">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-100">
                  Автосалон "Премиум Моторс"
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Продажа ТС
                </span>
              </div>
              <p className="text-xs text-zinc-400 hidden sm:block">
                Новые автомобили из салона и подержанные авто с авторынка
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <Coins className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">
                {playerCash.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-zinc-900/60 border-b border-zinc-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('new');
                setSelectedCarIndex(0);
                setPurchaseSuccessMessage(null);
              }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'new'
                  ? 'bg-emerald-600 text-white border border-emerald-500 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Новые авто ({DEALERSHIP_CARS.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('used');
                setSelectedCarIndex(0);
                setPurchaseSuccessMessage(null);
              }}
              className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center gap-2 relative ${
                activeTab === 'used'
                  ? 'bg-amber-600 text-white border border-amber-500 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Авторынок Б/У ({USED_CAR_CATALOG.length})</span>
            </button>
          </div>

          {activeTab === 'used' && (
            <div className="text-[11px] text-amber-400 font-mono flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Обновление каждые 5 мин
            </div>
          )}
        </div>

        {/* Success Alert Banner */}
        {purchaseSuccessMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-700/60 px-4 py-3 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{purchaseSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPurchaseSuccessMessage(null)}
              className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-900 text-emerald-200 hover:bg-emerald-800 text-xs font-bold"
            >
              Отлично
            </button>
          </div>
        )}

        {/* Modal Main Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Car Catalog List */}
          <div className="md:col-span-4 border-r border-zinc-800 bg-zinc-950/60 overflow-y-auto p-3 space-y-2 max-h-[220px] md:max-h-none">
            <div className="px-1 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {activeTab === 'new' ? 'Новые из автосалона' : 'Подержанные авто на рынке'}:
            </div>
            {carsList.map((car, idx) => {
              const isSelected = idx === selectedCarIndex;
              const isUsedCar = activeTab === 'used';
              return (
                <button
                  key={car.id}
                  onClick={() => {
                    setSelectedCarIndex(idx);
                    setPurchaseSuccessMessage(null);
                  }}
                  className={`w-full text-left p-3 min-h-[56px] rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? isUsedCar
                        ? 'bg-amber-600/15 border-amber-500 text-white'
                        : 'bg-emerald-600/15 border-emerald-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${isUsedCar ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {car.brand}
                      </span>
                      <h3 className="font-bold text-zinc-100 text-xs sm:text-sm leading-tight">{car.nameRu}</h3>
                    </div>
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${isUsedCar ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'}`}>
                      {car.priceRub.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400 mt-1">
                    <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{car.classType}</span>
                    <span>•</span>
                    <span>{car.year} г.</span>
                    <span>•</span>
                    <span className={isUsedCar ? 'text-amber-300' : 'text-emerald-400'}>
                      {isUsedCar ? `${((car as any).mileageKm / 1000).toFixed(0)}k км` : car.fuelTypeLabel}
                    </span>
                  </div>

                  {isUsedCar && (
                    <div className="w-full mt-1 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-zinc-800/60 pt-1">
                      <span>Состояние ДВС:</span>
                      <span className={(car as any).engineHealth > 50 ? 'text-emerald-400' : (car as any).engineHealth > 30 ? 'text-amber-400' : 'text-rose-400'}>
                        {(car as any).engineHealth}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Column: Car Details & Customization */}
          <div className="md:col-span-8 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5 bg-zinc-900">
            
            {/* Top Showcase: Live Canvas & High-level Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
              
              {/* Canvas Preview */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <canvas
                  ref={canvasRef}
                  width={220}
                  height={150}
                  className="w-full h-[140px] object-contain drop-shadow-xl"
                />
                <span className="text-[10px] text-zinc-400 mt-2 font-mono">Вид сверху (Визуализация ТС)</span>
              </div>

              {/* Title & Price Card */}
              <div className="sm:col-span-7 flex flex-col gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">{currentCar.brand}</span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-100">{currentCar.nameRu}</h2>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1">{currentCar.descriptionRu}</p>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="text-2xl font-mono font-bold text-emerald-400">
                    {currentCar.priceRub.toLocaleString('ru-RU')} ₽
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                    canAfford
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {canAfford ? 'Доступно к покупке' : 'Недостаточно денег'}
                  </span>
                </div>
              </div>
            </div>

            {/* Customization Options: Color & Transmission */}
            {activeTab === 'used' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Technical Health Indicators */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col gap-3">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Техническое состояние:
                  </label>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Состояние двигателя:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).engineHealth}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).engineHealth > 50 ? 'bg-emerald-500' : (currentCar as any).engineHealth > 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${(currentCar as any).engineHealth}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Состояние КПП:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).transmissionHealth}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).transmissionHealth > 50 ? 'bg-emerald-500' : (currentCar as any).transmissionHealth > 25 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${(currentCar as any).transmissionHealth}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Заряд аккумулятора:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).batteryCharge}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(currentCar as any).batteryCharge}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-zinc-400">Вода в радиаторе:</span>
                        <span className="font-bold text-zinc-200">{(currentCar as any).radiatorWater}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${(currentCar as any).radiatorPunctured ? 'bg-rose-600' : 'bg-sky-500'}`}
                          style={{ width: `${(currentCar as any).radiatorWater}%` }}
                        />
                      </div>
                      {(currentCar as any).radiatorPunctured && (
                        <div className="text-[10px] text-rose-400 mt-1 font-mono">
                          Внимание: Радиатор пробит (Течь ОЖ)
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Body & Modifications */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-2">
                      Модификации и кузов:
                    </label>
                    <div className="text-xs space-y-2 mt-1">
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Кузов:</span>
                        <span className="font-semibold text-zinc-200">{(currentCar as any).bodyCondition}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Цвет кузова:</span>
                        <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                          <span className="w-3.5 h-3.5 rounded-full border border-zinc-700" style={{ backgroundColor: (currentCar as any).color.hex }} />
                          {(currentCar as any).color.name}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-800/80 pb-1">
                        <span className="text-zinc-400">Коробка:</span>
                        <span className="font-semibold text-zinc-200">{(currentCar as any).hasManualTrans ? 'МКПП (Механика)' : 'АКПП (Автомат)'}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-zinc-400">Пробег:</span>
                        <span className="font-mono font-bold text-amber-400">{(currentCar as any).mileageKm.toLocaleString()} км</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(currentCar as any).hasGBO && (
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                        ГБО Пропан
                      </span>
                    )}
                    {(currentCar as any).isChiptuned && (
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded">
                        Чип-тюнинг
                      </span>
                    )}
                    {(currentCar as any).isHeavySuspended && (
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">
                        Усиленная подвеска
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Color Selector */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                    Заводской цвет кузова:
                  </label>
                  <div className="text-xs font-semibold text-emerald-400 mb-3">
                    {currentColor.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(currentCar as DealershipCarModel).availableColors.map((col, cIdx) => (
                      <button
                        key={col.name}
                        onClick={() => setSelectedColorIndex(cIdx)}
                        title={col.name}
                        className={`w-9 h-9 min-h-[36px] min-w-[36px] rounded-full border-2 transition-transform ${
                          cIdx === selectedColorIndex ? 'border-emerald-400 scale-110 ring-2 ring-emerald-500/30' : 'border-zinc-700'
                        }`}
                        style={{ backgroundColor: col.hex }}
                      />
                    ))}
                  </div>
                </div>

                {/* Transmission Selector */}
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
                    Коробка передач:
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      disabled={!currentCar.hasManualTrans}
                      onClick={() => setTransmissionMode('MANUAL')}
                      className={`p-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        transmissionMode === 'MANUAL'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      } ${!currentCar.hasManualTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span>МКПП (Механика)</span>
                      <span className="text-[10px] font-normal opacity-80">5-ступенчатая</span>
                    </button>

                    <button
                      disabled={!currentCar.hasAutoTrans}
                      onClick={() => setTransmissionMode('AUTO')}
                      className={`p-2 min-h-[44px] rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 ${
                        transmissionMode === 'AUTO'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      } ${!currentCar.hasAutoTrans ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <span>АКПП (Автомат)</span>
                      <span className="text-[10px] font-normal opacity-80">Гидротрансформатор</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Vehicle Specifications Table */}
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 p-4">
              <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">
                Технические характеристики:
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Год выпуска</span>
                  <span className="font-bold text-zinc-200">{currentCar.year} г.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Двигатель</span>
                  <span className="font-bold text-zinc-200 truncate block">{currentCar.engineSpec}</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Мощность</span>
                  <span className="font-bold text-emerald-400">{currentCar.powerHp} л.с.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Тип топлива</span>
                  <span className="font-bold text-amber-400">{currentCar.fuelTypeLabel}</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Макс. скорость</span>
                  <span className="font-bold text-zinc-200">{currentCar.topSpeedKmh} км/ч</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Разгон 0-100 км/ч</span>
                  <span className="font-bold text-zinc-200">{currentCar.accelSec} сек.</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Снаряженная масса</span>
                  <span className="font-bold text-zinc-200">{currentCar.weightKg} кг</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Объем бака</span>
                  <span className="font-bold text-zinc-200">{currentCar.tankCapacityL} литров</span>
                </div>

                <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80">
                  <span className="text-zinc-400 block text-[10px]">Габариты кузова</span>
                  <span className="font-bold text-zinc-200">{currentCar.dimensionsM}</span>
                </div>
              </div>
            </div>

            {/* Purchase Footer Action */}
            <div className="pt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between border-t border-zinc-800">
              <div className="text-xs text-zinc-400">
                При покупке вы получаете:<br />
                <span className="text-zinc-200 font-medium">
                  {getVehicleRequiredKeyType(currentCar.type) === 'iron'
                    ? 'Ключ зажигания, ПТС и СТС'
                    : getVehicleRequiredKeyType(currentCar.type) === 'gold'
                    ? 'Золотой ключ зажигания, ПТС и СТС'
                    : 'Ключ с пультом ЦЗ, ПТС и СТС'}
                </span>
              </div>

              <button
                disabled={!canAfford}
                onClick={handleBuy}
                className={`w-full sm:w-auto px-6 py-3 min-h-[48px] rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                  canAfford
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed'
                }`}
              >
                <Car className="w-5 h-5" />
                <span>Оформить за {currentCar.priceRub.toLocaleString('ru-RU')} ₽</span>
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

import { PhoneSpecs } from './types';

export interface PhoneModelTemplate {
  modelId: string;
  seriesName: string;
  modelName: string;
  brand: string;
  cpuModel: string;
  cpuFrequencyGhz: number;
  cpuCores: number;
  ramGb: number;
  storageGb: number;
  batteryCapacityMah: number;
  screenSizeInches: number;
  cameraSpecs: string;
  osName: string;
  osVersion: string;
  basePrice: number;
  colors: {
    itemId: string;
    colorNameRu: string;
    colorHex: string;
    accentHex: string;
    descriptionRu: string;
  }[];
}

export const PHONE_MODELS: Record<string, PhoneModelTemplate> = {
  aura_pro: {
    modelId: 'aura_pro',
    seriesName: 'Aura Pro 16',
    modelName: 'Aura Pro 16 Titanium',
    brand: 'Aura Tech',
    cpuModel: 'Bionic A18 Pro (6 ядер + 16-Core NPU)',
    cpuFrequencyGhz: 3.8,
    cpuCores: 6,
    ramGb: 12,
    storageGb: 512,
    batteryCapacityMah: 4685,
    screenSizeInches: 6.7,
    cameraSpecs: '48 MP Fusion + 12 MP Ultra-Wide + 12 MP 5x Telephoto',
    osName: 'AuraOS',
    osVersion: '18.2',
    basePrice: 120000,
    colors: [
      {
        itemId: 'phone_aura_pro_black',
        colorNameRu: 'Титановый Чёрный',
        colorHex: '#1e2022',
        accentHex: '#64748b',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в корпусе из черного аэрокосмического титана Grade 5.'
      },
      {
        itemId: 'phone_aura_pro_gold',
        colorNameRu: 'Пустынный Титан',
        colorHex: '#c9b59c',
        accentHex: '#d4af37',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в утонченном золотисто-песочном титановом исполнении.'
      },
      {
        itemId: 'phone_aura_pro_titanium',
        colorNameRu: 'Натуральный Титан',
        colorHex: '#8e8d8a',
        accentHex: '#94a3b8',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в классическом матовом сером натуральном титане.'
      },
      {
        itemId: 'phone_aura_pro_blue',
        colorNameRu: 'Глубокий Синий',
        colorHex: '#1e293b',
        accentHex: '#38bdf8',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в глубоком сапфировом синем цвете морских глубин.'
      }
    ]
  },
  quantum_ultra: {
    modelId: 'quantum_ultra',
    seriesName: 'Quantum Ultra S25',
    modelName: 'Quantum Ultra S25 AI Max',
    brand: 'Quantum Mobile',
    cpuModel: 'Snapdragon 8 Elite 4.32 ГГц (8 ядер Oryon Extreme)',
    cpuFrequencyGhz: 4.32,
    cpuCores: 8,
    ramGb: 16,
    storageGb: 512,
    batteryCapacityMah: 5300,
    screenSizeInches: 6.8,
    cameraSpecs: '200 MP Ultra-Vision OIS + 50 MP 10x Periscope + 12 MP Ultrawide',
    osName: 'OneQuantum',
    osVersion: '7.1',
    basePrice: 115000,
    colors: [
      {
        itemId: 'phone_quantum_black',
        colorNameRu: 'Фантомный Графит',
        colorHex: '#18181b',
        accentHex: '#71717a',
        descriptionRu: 'Ультимативный флагман Quantum Ultra S25 с матовым сатинированным стеклом и антибликовым экраном.'
      },
      {
        itemId: 'phone_quantum_silver',
        colorNameRu: 'Титановое Серебро',
        colorHex: '#cbd5e1',
        accentHex: '#0284c7',
        descriptionRu: 'Quantum Ultra S25 в сверкающем серебристом металле с полированными хромированными гранями.'
      },
      {
        itemId: 'phone_quantum_emerald',
        colorNameRu: 'Изумрудный Нефрит',
        colorHex: '#064e3b',
        accentHex: '#10b981',
        descriptionRu: 'Quantum Ultra S25 в богатом благородном темно-изумрудном оттенке с золотистой окантовкой линз.'
      },
      {
        itemId: 'phone_quantum_violet',
        colorNameRu: 'Аметистовый Шёлк',
        colorHex: '#4c1d95',
        accentHex: '#a855f7',
        descriptionRu: 'Quantum Ultra S25 в переливающемся глубоком аметистовом цвете с шелковистой текстурой задней панели.'
      }
    ]
  },
  pixel_nova: {
    modelId: 'pixel_nova',
    seriesName: 'Pixel Nova 9',
    modelName: 'Pixel Nova 9 AI Pro',
    brand: 'Nova Lab',
    cpuModel: 'Tensor G4 Neural Core 3.1 ГГц (AI Engine)',
    cpuFrequencyGhz: 3.1,
    cpuCores: 8,
    ramGb: 12,
    storageGb: 256,
    batteryCapacityMah: 4850,
    screenSizeInches: 6.4,
    cameraSpecs: '50 MP Octa-PD + 48 MP Quad-PD Telephoto (HDR+ Pro)',
    osName: 'Nova Pure OS',
    osVersion: '15.0',
    basePrice: 89000,
    colors: [
      {
        itemId: 'phone_pixel_obsidian',
        colorNameRu: 'Обсидиан',
        colorHex: '#27272a',
        accentHex: '#a1a1aa',
        descriptionRu: 'AI-смартфон Pixel Nova 9 с матовой полированной планкой камеры и черным обсидиановым стеклом.'
      },
      {
        itemId: 'phone_pixel_porcelain',
        colorNameRu: 'Фарфор',
        colorHex: '#f1f5f9',
        accentHex: '#e2e8f0',
        descriptionRu: 'Pixel Nova 9 в кристально чистом белом фарфоровом исполнении со светлым алюминиевым бампером.'
      },
      {
        itemId: 'phone_pixel_hazel',
        colorNameRu: 'Ореховый Шалфей',
        colorHex: '#3f4a3c',
        accentHex: '#84cc16',
        descriptionRu: 'Pixel Nova 9 в природном оливково-шалфейном оттенке с бронзовой полированной полосой визора.'
      },
      {
        itemId: 'phone_pixel_rose',
        colorNameRu: 'Розовый Кварц',
        colorHex: '#be7b82',
        accentHex: '#f43f5e',
        descriptionRu: 'Pixel Nova 9 в нежном кварцево-розовом градиенте с шелковистым сатинированием.'
      }
    ]
  },
  cyber_mech: {
    modelId: 'cyber_mech',
    seriesName: 'CyberPhone Mech-X',
    modelName: 'CyberPhone Mech-X Gaming',
    brand: 'HyperMech',
    cpuModel: 'Dimensity 9400 Extreme 4.35 ГГц (Vapor Chamber Cooling)',
    cpuFrequencyGhz: 4.35,
    cpuCores: 8,
    ramGb: 24,
    storageGb: 1024,
    batteryCapacityMah: 6600,
    screenSizeInches: 6.78,
    cameraSpecs: '50 MP Sony LYT-900 Dual OIS + RGB Halo Light Ring',
    osName: 'MechOS CyberUI',
    osVersion: '5.0',
    basePrice: 145000,
    colors: [
      {
        itemId: 'phone_cyber_dark',
        colorNameRu: 'Кибер-Графит',
        colorHex: '#0f172a',
        accentHex: '#06b6d4',
        descriptionRu: 'Геймерский монстр CyberPhone Mech-X с полупрозрачной крышкой, светящимися дорожками и медным радиатором.'
      },
      {
        itemId: 'phone_cyber_white',
        colorNameRu: 'Меха-Белый',
        colorHex: '#f8fafc',
        accentHex: '#f97316',
        descriptionRu: 'CyberPhone Mech-X в стиле научно-фантастических роботов меха: белый карбон и оранжевые маркеры.'
      },
      {
        itemId: 'phone_cyber_neon',
        colorNameRu: 'Неоновый Электрик',
        colorHex: '#172554',
        accentHex: '#eab308',
        descriptionRu: 'CyberPhone Mech-X в темно-синем корпусе с неоново-желтыми микросхемами и турбо-кулером.'
      }
    ]
  },
  neo_compact: {
    modelId: 'neo_compact',
    seriesName: 'Neo Compact 5G',
    modelName: 'Neo Compact Pocket Edition',
    brand: 'Nordic Neo',
    cpuModel: 'Helio G99 Ultra 2.2 ГГц (8 ядер Energy Saver)',
    cpuFrequencyGhz: 2.2,
    cpuCores: 8,
    ramGb: 8,
    storageGb: 128,
    batteryCapacityMah: 3800,
    screenSizeInches: 5.9,
    cameraSpecs: '48 MP AI Dual Lens + Super HDR',
    osName: 'NeoClean OS',
    osVersion: '4.0',
    basePrice: 42000,
    colors: [
      {
        itemId: 'phone_compact_navy',
        colorNameRu: 'Морской Индиго',
        colorHex: '#1e3a5f',
        accentHex: '#60a5fa',
        descriptionRu: 'Удобный компактный эргономичный смартфон в глубоком матовом синем цвете индиго.'
      },
      {
        itemId: 'phone_compact_gray',
        colorNameRu: 'Штормовой Базальт',
        colorHex: '#4b5563',
        accentHex: '#9ca3af',
        descriptionRu: 'Neo Compact в практичном сером противоударном поликарбонатном корпусе софт-тач.'
      },
      {
        itemId: 'phone_compact_coral',
        colorNameRu: 'Солнечный Коралл',
        colorHex: '#d97706',
        accentHex: '#fbbf24',
        descriptionRu: 'Neo Compact в ярком теплом кораллово-янтарном цвете, устойчивом к отпечаткам.'
      }
    ]
  }
};

export function getPhoneSpecsForItemId(itemId: string): PhoneSpecs {
  for (const modelKey of Object.keys(PHONE_MODELS)) {
    const model = PHONE_MODELS[modelKey];
    const colorMatch = model.colors.find((c) => c.itemId === itemId);
    if (colorMatch) {
      return {
        modelId: model.modelId,
        modelName: model.modelName,
        seriesName: model.seriesName,
        brand: model.brand,
        colorNameRu: colorMatch.colorNameRu,
        colorHex: colorMatch.colorHex,
        accentHex: colorMatch.accentHex,
        storageGb: model.storageGb,
        storageUsedGb: Math.round(model.storageGb * 0.18 * 10) / 10,
        cpuModel: model.cpuModel,
        cpuFrequencyGhz: model.cpuFrequencyGhz,
        cpuCores: model.cpuCores,
        ramGb: model.ramGb,
        ramUsedGb: Math.round(model.ramGb * 0.35 * 10) / 10,
        batteryCapacityMah: model.batteryCapacityMah,
        batteryLevelPct: 88,
        isPoweredOn: true,
        flashlightOn: false,
        wallpaperId: 'wallpaper_aurora',
        osName: model.osName,
        osVersion: model.osVersion,
        screenSizeInches: model.screenSizeInches,
        cameraSpecs: model.cameraSpecs,
        networkType: '5G',
        signalStrength: 4,
        airplaneMode: false,
        wifiConnected: true,
        bluetoothConnected: true,
        notes: [
          'Купить свежее моторное масло 5W-40 в PIT-STOP',
          'Проверить уровень тормозной жидкости и давление в шинах',
          'Код от домофона в квартире: 384К'
        ],
        unreadSmsCount: 2
      };
    }
  }

  // Default fallback if generic phone
  const fallbackModel = PHONE_MODELS.aura_pro;
  const fallbackColor = fallbackModel.colors[0];
  return {
    modelId: fallbackModel.modelId,
    modelName: fallbackModel.modelName,
    seriesName: fallbackModel.seriesName,
    brand: fallbackModel.brand,
    colorNameRu: fallbackColor.colorNameRu,
    colorHex: fallbackColor.colorHex,
    accentHex: fallbackColor.accentHex,
    storageGb: fallbackModel.storageGb,
    storageUsedGb: 64,
    cpuModel: fallbackModel.cpuModel,
    cpuFrequencyGhz: fallbackModel.cpuFrequencyGhz,
    cpuCores: fallbackModel.cpuCores,
    ramGb: fallbackModel.ramGb,
    ramUsedGb: 4.2,
    batteryCapacityMah: fallbackModel.batteryCapacityMah,
    batteryLevelPct: 85,
    isPoweredOn: true,
    flashlightOn: false,
    wallpaperId: 'wallpaper_aurora',
    osName: fallbackModel.osName,
    osVersion: fallbackModel.osVersion,
    screenSizeInches: fallbackModel.screenSizeInches,
    cameraSpecs: fallbackModel.cameraSpecs,
    networkType: '5G',
    signalStrength: 4,
    airplaneMode: false,
    wifiConnected: true,
    bluetoothConnected: false,
    notes: ['Заметка: зарядить телефон перед дальней поездкой'],
    unreadSmsCount: 1
  };
}

export interface PhoneContact {
  id: string;
  nameRu: string;
  role: string;
  number: string;
  avatarColor: string;
  avatarIcon: string;
  description: string;
  actionType: 'hospital' | 'pitstop' | 'taxi' | 'emergency' | 'friend';
}

export const PHONE_CONTACTS: PhoneContact[] = [
  {
    id: 'contact_hospital',
    nameRu: 'Городская Больница №1',
    role: 'Служба спасения & Эвакуация',
    number: '112 / 03',
    avatarColor: '#ef4444',
    avatarIcon: 'Ambulance',
    description: 'Дежурный врач скорой помощи. Вызов неотложной реанимации или консультация по травмам.',
    actionType: 'hospital'
  },
  {
    id: 'contact_pitstop',
    nameRu: 'Автосервис "PIT-STOP"',
    role: 'Мобильный выезд & Эвакуатор',
    number: '8 (800) 555-35-35',
    avatarColor: '#0284c7',
    avatarIcon: 'Wrench',
    description: 'Круглосуточный диспетчер автосервиса. Диагностика, эвакуация неисправных машин и доставка запчастей.',
    actionType: 'pitstop'
  },
  {
    id: 'contact_taxi',
    nameRu: 'Городское Такси "Вираж"',
    role: 'Пассажирские перевозки',
    number: '8 (495) 777-10-10',
    avatarColor: '#eab308',
    avatarIcon: 'Car',
    description: 'Быстрая подача комфортного автомобиля в любую точку города.',
    actionType: 'taxi'
  },
  {
    id: 'contact_mchs',
    nameRu: 'Экстренная Служба МЧС',
    role: 'Спасательный отряд 112',
    number: '112',
    avatarColor: '#f97316',
    avatarIcon: 'ShieldAlert',
    description: 'Единая дежурно-диспетчерская служба. Ликвидация последствий аварий и пожаров.',
    actionType: 'emergency'
  }
];

export interface PhoneSmsMessage {
  id: string;
  senderName: string;
  senderPhone: string;
  text: string;
  timestamp: string;
  isRead: boolean;
  avatarColor: string;
}

export const INITIAL_PHONE_MESSAGES: PhoneSmsMessage[] = [
  {
    id: 'sms_pitstop_1',
    senderName: 'PIT-STOP Сервис',
    senderPhone: '8-800-PITSTOP',
    text: 'Напоминание: сезонное ТО, проверка развала-схождения и уровня моторного масла доступны на подъемнике PIT-STOP 24/7.',
    timestamp: 'Вчера',
    isRead: false,
    avatarColor: '#0284c7'
  },
  {
    id: 'sms_mchs_1',
    senderName: 'МЧС Предупреждение',
    senderPhone: '112-INFO',
    text: 'Погода в регионе: ожидается усиление ветра и возможные осадки. Соблюдайте дистанцию на трассе и скоростной режим.',
    timestamp: '2 дня назад',
    isRead: true,
    avatarColor: '#f97316'
  }
];

export interface PhoneWallpaper {
  id: string;
  nameRu: string;
  previewGradient: string;
  cssBackground: string;
}

export const PHONE_WALLPAPERS: PhoneWallpaper[] = [
  {
    id: 'wallpaper_aurora',
    nameRu: 'Северное Сияние (OLED)',
    previewGradient: 'from-emerald-950 via-slate-900 to-indigo-950',
    cssBackground: 'linear-gradient(145deg, #022c22 0%, #0f172a 45%, #1e1b4b 100%)'
  },
  {
    id: 'wallpaper_sunset',
    nameRu: 'Закат над Трассой',
    previewGradient: 'from-amber-950 via-rose-900 to-slate-950',
    cssBackground: 'linear-gradient(145deg, #451a03 0%, #881337 50%, #020617 100%)'
  },
  {
    id: 'wallpaper_cyber',
    nameRu: 'Кибернетический Неон',
    previewGradient: 'from-cyan-950 via-blue-900 to-slate-950',
    cssBackground: 'linear-gradient(145deg, #083344 0%, #1e3a8a 50%, #030712 100%)'
  },
  {
    id: 'wallpaper_titanium',
    nameRu: 'Шлифованный Титан',
    previewGradient: 'from-slate-900 via-zinc-800 to-slate-950',
    cssBackground: 'linear-gradient(145deg, #0f172a 0%, #27272a 50%, #020617 100%)'
  },
  {
    id: 'wallpaper_amethyst',
    nameRu: 'Тёмный Аметист',
    previewGradient: 'from-purple-950 via-fuchsia-950 to-slate-950',
    cssBackground: 'linear-gradient(145deg, #2e1065 0%, #581c87 50%, #09090b 100%)'
  }
];

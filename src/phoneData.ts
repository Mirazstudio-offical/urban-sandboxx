import {
  PhoneSpecs,
  PhoneAttributes,
  PhoneChassisStyle,
  HardwareComponentKind,
  HardwareComponentAttributes,
  InstalledHardwareComponent,
  RgbColor
} from './types';

export function hexToRgb(hex: string): RgbColor {
  const clean = (hex || '#1e2022').replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return { r: 30, g: 32, b: 34 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

export function formatRgbString(rgb?: RgbColor | null): string {
  if (!rgb) return 'RGB(30, 32, 34)';
  return `RGB(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

// =========================================================================
// UNIFIED HARDWARE COMPONENT CATALOG DEFAULTS (1 base item per component type)
// =========================================================================
export const HARDWARE_COMPONENT_KINDS: HardwareComponentKind[] = [
  'hw_display',
  'hw_cpu',
  'hw_ram',
  'hw_ssd',
  'hw_hdd',
  'hw_battery',
  'hw_motherboard',
  'hw_camera',
  'hw_modem',
  'hw_speaker',
  'hw_charging_port'
];

export const DEFAULT_HARDWARE_COMPONENTS: Record<HardwareComponentKind, HardwareComponentAttributes> = {
  hw_display: {
    kind: 'hw_display',
    nameRu: 'Дисплейный модуль LTPO OLED 6.7"',
    brand: 'Samsung Display',
    model: 'M14 LTPO-67-120',
    materialRu: 'Закалённое стекло Ceramic Shield, OLED-матрица на полиимидной подложке, медный шлейф FPC',
    connectorRu: 'Гибкий шлейф FPC MIPI DSI (40-pin B2B)',
    colorHex: '#0f172a',
    colorRgb: { r: 15, g: 23, b: 42 },
    colorNameRu: 'Глубокий чёрный антиблик',
    accentHex: '#d97706',
    dimensionsRu: '156.4 × 71.8 × 1.7 мм (6.7")',
    formFactorRu: 'Безрамочный модуль 6.7"',
    weightGrams: 42,
    volumeL: 0.02,
    specsSummaryRu: '6.7" LTPO OLED · 2796×1290 · 1–120 Гц · 2000 нит',
    specs: {
      'Диагональ': '6.7"',
      'Матрица': 'LTPO OLED',
      'Разрешение': '2796 × 1290 px',
      'Частота': '1–120 Гц',
      'Яркость': '2000 нит HDR'
    },
    compatibilityRu: 'Флагманские смартфоны 6.7"'
  },
  hw_cpu: {
    kind: 'hw_cpu',
    nameRu: 'Мобильный процессор (SoC)',
    brand: 'Aura Silicon',
    model: 'Bionic A18 Pro',
    materialRu: 'Монокристаллический кремний (3 нм), многослойная органическая подложка, позолоченные контакты',
    connectorRu: 'Пайка BGA (FBGA-1532, PoP)',
    colorHex: '#1e293b',
    colorRgb: { r: 30, g: 41, b: 59 },
    colorNameRu: 'Графитовый кремний',
    accentHex: '#eab308',
    dimensionsRu: '11.4 × 10.8 × 1.1 мм',
    formFactorRu: 'Чип SoC FBGA-1532',
    weightGrams: 4,
    volumeL: 0.002,
    specsSummaryRu: '6 ядер · 3.8 ГГц · 3 нм · 16-ядерный NPU',
    specs: {
      'Ядра': '6 (2P + 4E)',
      'Частота': '3.8 ГГц',
      'Техпроцесс': '3 нм FinFET',
      'Нейроблок': '16-Core NPU (38 TOPS)',
      'TDP': '6.5 Вт'
    },
    compatibilityRu: 'Системные платы мобильных устройств'
  },
  hw_ram: {
    kind: 'hw_ram',
    nameRu: 'Модуль оперативной памяти LPDDR5X',
    brand: 'SK Hynix',
    model: 'H58G66BK8BX067 12GB',
    materialRu: 'Кремниевые кристаллы DRAM, эпоксидный компаунд, контактные шары припоя BGA',
    connectorRu: 'Пайка PoP BGA-496 (поверх SoC)',
    colorHex: '#18181b',
    colorRgb: { r: 24, g: 24, b: 27 },
    colorNameRu: 'Матовый чёрный компаунд',
    accentHex: '#38bdf8',
    dimensionsRu: '12.4 × 15.0 × 0.8 мм',
    formFactorRu: 'Чип PoP LPDDR5X',
    weightGrams: 2,
    volumeL: 0.001,
    specsSummaryRu: '12 ГБ · LPDDR5X · 8533 МТ/с · 4 канала',
    specs: {
      'Объём': '12 ГБ',
      'Тип памяти': 'LPDDR5X',
      'Частота': '8533 МТ/с',
      'Питание': '1.05 В / 0.5 В'
    },
    compatibilityRu: 'Смартфоны и ультрабуки с шиной LPDDR5X'
  },
  hw_ssd: {
    kind: 'hw_ssd',
    nameRu: 'Твердотельный накопитель SSD / UFS 4.0',
    brand: 'Kioxia',
    model: 'BiCS6 UFS 4.0 512GB',
    materialRu: 'Стеклотекстолит FR-4, кристаллы 3D TLC NAND, контроллер, медная термофольга',
    connectorRu: 'Пайка BGA-153 (интерфейс UFS 4.0 / NVMe)',
    colorHex: '#14532d',
    colorRgb: { r: 20, g: 83, b: 45 },
    colorNameRu: 'Тёмно-изумрудный текстолит',
    accentHex: '#f59e0b',
    dimensionsRu: '11.5 × 13.0 × 1.0 мм',
    formFactorRu: 'Модуль BGA-153 (UFS 4.0)',
    weightGrams: 3,
    volumeL: 0.002,
    specsSummaryRu: '512 ГБ · 3D TLC NAND · Чтение 4200 МБ/с',
    specs: {
      'Объём': '512 ГБ',
      'Тип памяти': '3D TLC NAND',
      'Чтение': '4200 МБ/с',
      'Запись': '2800 МБ/с',
      'Ресурс': '350 TBW'
    },
    compatibilityRu: 'Смартфоны, планшеты и компактные ПК'
  },
  hw_hdd: {
    kind: 'hw_hdd',
    nameRu: 'Жёсткий диск 2.5" SATA',
    brand: 'Seagate',
    model: 'Barracuda ST1000LM049 1TB',
    materialRu: 'Литой алюминиевый гермоблок, магнитные стеклянные пластины, стальная крышка, плата контроллера FR-4',
    connectorRu: 'SATA III 6 Гбит/с (7-pin данные + 15-pin питание)',
    colorHex: '#475569',
    colorRgb: { r: 71, g: 85, b: 105 },
    colorNameRu: 'Сталистый алюминий и чёрный корпус',
    accentHex: '#22c55e',
    dimensionsRu: '100.3 × 69.8 × 7.0 мм (2.5")',
    formFactorRu: '2.5" SATA Slim (7 мм)',
    weightGrams: 95,
    volumeL: 0.05,
    specsSummaryRu: '1000 ГБ (1 ТБ) · 7200 об/мин · Кэш 128 МБ · SATA III',
    specs: {
      'Объём': '1000 ГБ (1 ТБ)',
      'Шпиндель': '7200 об/мин',
      'Буфер': '128 МБ DRAM',
      'Интерфейс': 'SATA III (6 Гбит/с)',
      'Скорость': '160 МБ/с'
    },
    compatibilityRu: 'Ноутбуки, настольные ПК, внешние боксы USB-SATA'
  },
  hw_battery: {
    kind: 'hw_battery',
    nameRu: 'Литий-полимерный аккумулятор',
    brand: 'ATL Power',
    model: 'A3106-LiPol 4685mAh',
    materialRu: 'Литий-полимерная ячейка, алюминиево-полимерный ламинат, плата защиты BMS, медный шлейф',
    connectorRu: 'Шлейф FPC с разъёмом B2B (4-pin, питание + NTC)',
    colorHex: '#1f2937',
    colorRgb: { r: 31, g: 41, b: 55 },
    colorNameRu: 'Графитовый чёрный пакет',
    accentHex: '#fbbf24',
    dimensionsRu: '84.0 × 56.0 × 4.6 мм',
    formFactorRu: 'Плоская ячейка Li-Pol (призматическая)',
    weightGrams: 64,
    volumeL: 0.022,
    specsSummaryRu: '4685 мА·ч · 18.1 Вт·ч · 3.87 В · Быстрая зарядка 35 Вт',
    specs: {
      'Ёмкость': '4685 мА·ч',
      'Энергия': '18.1 Вт·ч',
      'Напряжение': '3.87 В',
      'Химия': 'Li-Pol',
      'Зарядка': 'до 35 Вт (PD)'
    },
    compatibilityRu: 'Смартфоны и портативные гаджеты'
  },
  hw_motherboard: {
    kind: 'hw_motherboard',
    nameRu: 'Системная плата смартфона',
    brand: 'Foxconn HDI',
    model: 'LB-A18-12L Sandwich',
    materialRu: '12-слойный стеклотекстолит FR-4 HDI, медная металлизация, экраны из нержавеющей стали',
    connectorRu: 'Винтовой монтаж M1.2 + разъёмы B2B/FPC и коаксиальные I-PEX',
    colorHex: '#064e3b',
    colorRgb: { r: 6, g: 78, b: 59 },
    colorNameRu: 'Тёмно-зелёная паяльная маска',
    accentHex: '#eab308',
    dimensionsRu: '92.0 × 48.0 × 2.6 мм',
    formFactorRu: 'Двухэтажная HDI PCB',
    weightGrams: 24,
    volumeL: 0.012,
    specsSummaryRu: '12 слоёв HDI · PCIe/UFS шины · PMIC + NFC контроллер',
    specs: {
      'Слои PCB': '12 слоёв HDI',
      'Компоновка': 'Двухслойный «сэндвич»',
      'Питание': 'Многофазный PMIC',
      'Датчики': 'Гироскоп, барометр, NFC'
    },
    compatibilityRu: 'Шасси смартфонов соответствующей серии'
  },
  hw_camera: {
    kind: 'hw_camera',
    nameRu: 'Тройной оптический модуль камеры',
    brand: 'Sony Semiconductor',
    model: 'IMX903 Triple OIS Array',
    materialRu: 'Алюминиевая рама, сапфировые линзы, CMOS-сенсоры, магнитный стабилизатор OIS',
    connectorRu: 'Тройной гибкий шлейф FPC MIPI CSI-2 (34-pin)',
    colorHex: '#111827',
    colorRgb: { r: 17, g: 24, b: 39 },
    colorNameRu: 'Чёрный оптический анод',
    accentHex: '#0284c7',
    dimensionsRu: '31.2 × 30.0 × 6.8 мм',
    formFactorRu: 'Блок камер Triple OIS',
    weightGrams: 18,
    volumeL: 0.007,
    specsSummaryRu: '48 МП f/1.78 OIS + 12 МП ширик + 12 МП 5x зум',
    specs: {
      'Основная': '48 МП (f/1.78, OIS)',
      'Широкоуг.': '12 МП (120°)',
      'Телеобъектив': '12 МП (5x опт. зум)',
      'Видео': '4K 120 fps HDR'
    },
    compatibilityRu: 'Смартфоны с интерфейсом MIPI CSI-2'
  },
  hw_modem: {
    kind: 'hw_modem',
    nameRu: '5G Модем и Wi-Fi/BT радиомодуль',
    brand: 'Qualcomm RF',
    model: 'Snapdragon X75 + FastConnect 7800',
    materialRu: 'Кремниевый RF-трансивер, керамические SAW-фильтры, стальной EMI-экран',
    connectorRu: 'Пайка BGA + 3 коаксиальных RF-разъёма MHF4',
    colorHex: '#334155',
    colorRgb: { r: 51, g: 65, b: 85 },
    colorNameRu: 'Матовый стальной экран',
    accentHex: '#38bdf8',
    dimensionsRu: '14.0 × 12.0 × 1.3 мм',
    formFactorRu: 'RF-модуль BGA + MHF4',
    weightGrams: 5,
    volumeL: 0.002,
    specsSummaryRu: '5G Sub-6/mmWave · Wi-Fi 7 · Bluetooth 5.4 · GNSS',
    specs: {
      'Сотовая сеть': '5G NR / LTE Cat.20',
      'Wi-Fi': 'Wi-Fi 7 (802.11be)',
      'Bluetooth': '5.4 LE Audio',
      'Навигация': 'GPS, ГЛОНАСС, Galileo'
    },
    compatibilityRu: 'Мобильные системные платы'
  },
  hw_speaker: {
    kind: 'hw_speaker',
    nameRu: 'Стереодинамик и линейный вибромотор',
    brand: 'AAC Technologies',
    model: 'SLS-1511 Stereo + X-Axis Haptic',
    materialRu: 'Поликарбонатная акустическая камера, неодимовый магнит N52, медная звуковая катушка',
    connectorRu: 'Пружинные контакты Pogo-pin / шлейф FPC 4-pin',
    colorHex: '#27272a',
    colorRgb: { r: 39, g: 39, b: 42 },
    colorNameRu: 'Антрацитовый полимер',
    accentHex: '#b45309',
    dimensionsRu: '28.0 × 14.0 × 3.8 мм',
    formFactorRu: 'Акустический блок Box',
    weightGrams: 9,
    volumeL: 0.003,
    specsSummaryRu: '1.8 Вт · Стерео + линейный вибропривод X-Axis',
    specs: {
      'Мощность': '1.8 Вт RMS',
      'Сопротивление': '8 Ом',
      'Вибропривод': 'Линейный X-Axis 170 Гц',
      'Защита': 'Влагостойкая мембрана'
    },
    compatibilityRu: 'Смартфоны и портативная электроника'
  },
  hw_charging_port: {
    kind: 'hw_charging_port',
    nameRu: 'Плата разъёма USB Type-C и питания',
    brand: 'Amphenol Mobile',
    model: 'USBC-32G2-PD45 Flex',
    materialRu: 'Никелированный стальной кожух, медные контакты с позолотой, гибкий шлейф FPC',
    connectorRu: 'Разъём B2B (24-pin) к системной плате + внешний USB Type-C',
    colorHex: '#3f3f46',
    colorRgb: { r: 63, g: 63, b: 70 },
    colorNameRu: 'Никель и медный шлейф',
    accentHex: '#d97706',
    dimensionsRu: '36.0 × 16.0 × 3.2 мм',
    formFactorRu: 'Шлейф USB-C + микрофон',
    weightGrams: 6,
    volumeL: 0.002,
    specsSummaryRu: 'USB-C 3.2 Gen 2 (10 Гбит/с) · Power Delivery до 45 Вт',
    specs: {
      'Порт': 'USB Type-C 3.2 Gen 2',
      'Скорость': '10 Гбит/с',
      'Питание': 'USB-PD до 45 Вт',
      'Уплотнение': 'Силиконовая манжета IP68'
    },
    compatibilityRu: 'Смартфоны и компактные устройства USB-C'
  }
};

export function getDefaultHardwareAttributes(kind: HardwareComponentKind): HardwareComponentAttributes {
  const def = DEFAULT_HARDWARE_COMPONENTS[kind] || DEFAULT_HARDWARE_COMPONENTS.hw_cpu;
  return {
    ...def,
    colorRgb: { ...def.colorRgb },
    specs: { ...def.specs }
  };
}

// =========================================================================
// UNIFIED PHONE MODEL TEMPLATES (used to assemble PhoneAttributes + Components)
// =========================================================================
export interface PhoneModelColorPreset {
  legacyItemId: string;
  colorKey: string;
  colorNameRu: string;
  colorHex: string;
  accentHex: string;
  cameraPlateColor?: string;
  descriptionRu: string;
}

export interface PhoneModelTemplate {
  modelId: string;
  seriesName: string;
  modelName: string;
  brand: string;
  chassisStyle: PhoneChassisStyle;
  materialRu: string;
  formFactorRu: string;
  dimensionsRu: string;
  weightGrams: number;
  volumeL: number;
  ingressProtectionRu: string;
  cpuBrand: string;
  cpuModel: string;
  cpuFrequencyGhz: number;
  cpuCores: number;
  cpuProcessNm: number;
  ramBrand: string;
  ramType: string;
  ramGb: number;
  storageBrand: string;
  storageType: string;
  storageGb: number;
  batteryBrand: string;
  batteryCapacityMah: number;
  batteryChargingW: number;
  displayBrand: string;
  displayPanelType: string;
  displayResolution: string;
  displayRefreshHz: number;
  screenSizeInches: number;
  cameraBrand: string;
  cameraMegaPixels: number;
  cameraSpecs: string;
  modemModel: string;
  networkType: '5G' | 'LTE' | '4G' | 'No SIM';
  chargingPortType: string;
  osName: string;
  osVersion: string;
  basePrice: number;
  colors: PhoneModelColorPreset[];
}

export const PHONE_MODELS: Record<string, PhoneModelTemplate> = {
  aura_pro: {
    modelId: 'aura_pro',
    seriesName: 'Aura Pro 16',
    modelName: 'Aura Pro 16 Titanium',
    brand: 'Aura Tech',
    chassisStyle: 'aura',
    materialRu: 'Титан Grade 5 (рамка), закалённое матовое стекло Ceramic Shield',
    formFactorRu: 'Смартфон-моноблок',
    dimensionsRu: '160.2 × 76.7 × 8.2 мм',
    weightGrams: 221,
    volumeL: 0.18,
    ingressProtectionRu: 'IP68 (до 6 м)',
    cpuBrand: 'Aura Silicon',
    cpuModel: 'Bionic A18 Pro (6 ядер + 16-Core NPU)',
    cpuFrequencyGhz: 3.8,
    cpuCores: 6,
    cpuProcessNm: 3,
    ramBrand: 'SK Hynix',
    ramType: 'LPDDR5X',
    ramGb: 12,
    storageBrand: 'Kioxia',
    storageType: 'NVMe / UFS 4.0',
    storageGb: 512,
    batteryBrand: 'ATL Power',
    batteryCapacityMah: 4685,
    batteryChargingW: 35,
    displayBrand: 'Samsung Display',
    displayPanelType: 'LTPO OLED',
    displayResolution: '2796 × 1290',
    displayRefreshHz: 120,
    screenSizeInches: 6.7,
    cameraBrand: 'Sony Semiconductor',
    cameraMegaPixels: 48,
    cameraSpecs: '48 MP Fusion + 12 MP Ultra-Wide + 12 MP 5x Telephoto',
    modemModel: 'Qualcomm X75 5G + Wi-Fi 7',
    networkType: '5G',
    chargingPortType: 'USB-C 3.2 Gen 2 (10 Гбит/с)',
    osName: 'AuraOS',
    osVersion: '18.2',
    basePrice: 120000,
    colors: [
      {
        legacyItemId: 'phone_aura_pro_black',
        colorKey: 'black',
        colorNameRu: 'Титановый Чёрный',
        colorHex: '#1e2022',
        accentHex: '#64748b',
        cameraPlateColor: '#17181a',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в корпусе из черного аэрокосмического титана Grade 5.'
      },
      {
        legacyItemId: 'phone_aura_pro_gold',
        colorKey: 'gold',
        colorNameRu: 'Пустынный Титан',
        colorHex: '#c9b59c',
        accentHex: '#d4af37',
        cameraPlateColor: '#b9a388',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в утонченном золотисто-песочном титановом исполнении.'
      },
      {
        legacyItemId: 'phone_aura_pro_titanium',
        colorKey: 'titanium',
        colorNameRu: 'Натуральный Титан',
        colorHex: '#8e8d8a',
        accentHex: '#94a3b8',
        cameraPlateColor: '#807f7c',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в классическом матовом сером натуральном титане.'
      },
      {
        legacyItemId: 'phone_aura_pro_blue',
        colorKey: 'blue',
        colorNameRu: 'Глубокий Синий',
        colorHex: '#1e293b',
        accentHex: '#38bdf8',
        cameraPlateColor: '#172033',
        descriptionRu: 'Флагманский смартфон Aura Pro 16 в глубоком сапфировом синем цвете морских глубин.'
      }
    ]
  },
  quantum_ultra: {
    modelId: 'quantum_ultra',
    seriesName: 'Quantum Ultra S25',
    modelName: 'Quantum Ultra S25 AI Max',
    brand: 'Quantum Mobile',
    chassisStyle: 'quantum',
    materialRu: 'Шлифованный титан, сатинированное стекло Gorilla Armor с антибликом',
    formFactorRu: 'Флагманский моноблок со стилусом S-Pen',
    dimensionsRu: '162.8 × 77.6 × 8.2 мм',
    weightGrams: 232,
    volumeL: 0.19,
    ingressProtectionRu: 'IP68',
    cpuBrand: 'Qualcomm',
    cpuModel: 'Snapdragon 8 Elite 4.32 ГГц (8 ядер Oryon Extreme)',
    cpuFrequencyGhz: 4.32,
    cpuCores: 8,
    cpuProcessNm: 3,
    ramBrand: 'Samsung Semiconductor',
    ramType: 'LPDDR5X',
    ramGb: 16,
    storageBrand: 'Samsung Semiconductor',
    storageType: 'UFS 4.0',
    storageGb: 512,
    batteryBrand: 'SDI Energy',
    batteryCapacityMah: 5300,
    batteryChargingW: 45,
    displayBrand: 'Samsung Display',
    displayPanelType: 'Dynamic AMOLED 2X LTPO',
    displayResolution: '3120 × 1440',
    displayRefreshHz: 120,
    screenSizeInches: 6.8,
    cameraBrand: 'Samsung ISOCELL',
    cameraMegaPixels: 200,
    cameraSpecs: '200 MP Ultra-Vision OIS + 50 MP 10x Periscope + 12 MP Ultrawide',
    modemModel: 'Snapdragon X80 5G + Wi-Fi 7',
    networkType: '5G',
    chargingPortType: 'USB-C 3.2 Gen 1 (45 Вт PD)',
    osName: 'OneQuantum',
    osVersion: '7.1',
    basePrice: 115000,
    colors: [
      {
        legacyItemId: 'phone_quantum_black',
        colorKey: 'black',
        colorNameRu: 'Фантомный Графит',
        colorHex: '#18181b',
        accentHex: '#71717a',
        descriptionRu: 'Ультимативный флагман Quantum Ultra S25 с матовым сатинированным стеклом и антибликовым экраном.'
      },
      {
        legacyItemId: 'phone_quantum_silver',
        colorKey: 'silver',
        colorNameRu: 'Титановое Серебро',
        colorHex: '#cbd5e1',
        accentHex: '#0284c7',
        descriptionRu: 'Quantum Ultra S25 в сверкающем серебристом металле с полированными хромированными гранями.'
      },
      {
        legacyItemId: 'phone_quantum_emerald',
        colorKey: 'emerald',
        colorNameRu: 'Изумрудный Нефрит',
        colorHex: '#064e3b',
        accentHex: '#10b981',
        descriptionRu: 'Quantum Ultra S25 в богатом благородном темно-изумрудном оттенке с золотистой окантовкой линз.'
      },
      {
        legacyItemId: 'phone_quantum_violet',
        colorKey: 'violet',
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
    chassisStyle: 'pixel',
    materialRu: 'Переработанный алюминий, закалённое стекло Gorilla Glass Victus 2',
    formFactorRu: 'Камерофон-моноблок с горизонтальным визором',
    dimensionsRu: '152.8 × 72.0 × 8.5 мм',
    weightGrams: 198,
    volumeL: 0.17,
    ingressProtectionRu: 'IP68',
    cpuBrand: 'Nova Lab Silicon',
    cpuModel: 'Tensor G4 Neural Core 3.1 ГГц (AI Engine)',
    cpuFrequencyGhz: 3.1,
    cpuCores: 8,
    cpuProcessNm: 4,
    ramBrand: 'Micron',
    ramType: 'LPDDR5X',
    ramGb: 12,
    storageBrand: 'Micron',
    storageType: 'UFS 3.1',
    storageGb: 256,
    batteryBrand: 'Sunwoda',
    batteryCapacityMah: 4850,
    batteryChargingW: 30,
    displayBrand: 'BOE Display',
    displayPanelType: 'Actua OLED LTPO',
    displayResolution: '2856 × 1280',
    displayRefreshHz: 120,
    screenSizeInches: 6.4,
    cameraBrand: 'Sony / Samsung',
    cameraMegaPixels: 50,
    cameraSpecs: '50 MP Octa-PD + 48 MP Quad-PD Telephoto (HDR+ Pro)',
    modemModel: 'Exynos 5400 5G + Wi-Fi 7',
    networkType: '5G',
    chargingPortType: 'USB-C 3.2 (30 Вт PD)',
    osName: 'Nova Pure OS',
    osVersion: '15.0',
    basePrice: 89000,
    colors: [
      {
        legacyItemId: 'phone_pixel_obsidian',
        colorKey: 'obsidian',
        colorNameRu: 'Обсидиан',
        colorHex: '#27272a',
        accentHex: '#a1a1aa',
        cameraPlateColor: '#1f1f22',
        descriptionRu: 'AI-смартфон Pixel Nova 9 с матовой полированной планкой камеры и черным обсидиановым стеклом.'
      },
      {
        legacyItemId: 'phone_pixel_porcelain',
        colorKey: 'porcelain',
        colorNameRu: 'Фарфор',
        colorHex: '#f1f5f9',
        accentHex: '#cbd5e1',
        cameraPlateColor: '#e2e8f0',
        descriptionRu: 'Pixel Nova 9 в кристально чистом белом фарфоровом исполнении со светлым алюминиевым бампером.'
      },
      {
        legacyItemId: 'phone_pixel_hazel',
        colorKey: 'hazel',
        colorNameRu: 'Ореховый Шалфей',
        colorHex: '#3f4a3c',
        accentHex: '#84cc16',
        cameraPlateColor: '#343e32',
        descriptionRu: 'Pixel Nova 9 в природном оливково-шалфейном оттенке с бронзовой полированной полосой визора.'
      },
      {
        legacyItemId: 'phone_pixel_rose',
        colorKey: 'rose',
        colorNameRu: 'Розовый Кварц',
        colorHex: '#be7b82',
        accentHex: '#f43f5e',
        cameraPlateColor: '#ab6c73',
        descriptionRu: 'Pixel Nova 9 в нежном кварцево-розовом градиенте с шелковистым сатинированием.'
      }
    ]
  },
  cyber_mech: {
    modelId: 'cyber_mech',
    seriesName: 'CyberPhone Mech-X',
    modelName: 'CyberPhone Mech-X Gaming',
    brand: 'HyperMech',
    chassisStyle: 'cyber',
    materialRu: 'Авиационный алюминий, полупрозрачное стекло, медная испарительная камера',
    formFactorRu: 'Игровой моноблок с активным охлаждением и RGB-кольцом',
    dimensionsRu: '164.0 × 76.8 × 9.4 мм',
    weightGrams: 248,
    volumeL: 0.21,
    ingressProtectionRu: 'IP54 (воздуховод кулера)',
    cpuBrand: 'MediaTek',
    cpuModel: 'Dimensity 9400 Extreme 4.35 ГГц (Vapor Chamber Cooling)',
    cpuFrequencyGhz: 4.35,
    cpuCores: 8,
    cpuProcessNm: 3,
    ramBrand: 'SK Hynix',
    ramType: 'LPDDR5T',
    ramGb: 24,
    storageBrand: 'Kioxia',
    storageType: 'UFS 4.0 Pro',
    storageGb: 1024,
    batteryBrand: 'ATL Dual-Cell',
    batteryCapacityMah: 6600,
    batteryChargingW: 120,
    displayBrand: 'BOE Gaming OLED',
    displayPanelType: 'AMOLED 165 Гц',
    displayResolution: '2480 × 1116',
    displayRefreshHz: 165,
    screenSizeInches: 6.78,
    cameraBrand: 'Sony LYTIA',
    cameraMegaPixels: 50,
    cameraSpecs: '50 MP Sony LYT-900 Dual OIS + RGB Halo Light Ring',
    modemModel: 'MediaTek M90 5G + Wi-Fi 7 Low-Latency',
    networkType: '5G',
    chargingPortType: 'Dual USB-C 3.2 (120 Вт HyperCharge)',
    osName: 'MechOS CyberUI',
    osVersion: '5.0',
    basePrice: 145000,
    colors: [
      {
        legacyItemId: 'phone_cyber_dark',
        colorKey: 'dark',
        colorNameRu: 'Кибер-Графит',
        colorHex: '#0f172a',
        accentHex: '#06b6d4',
        descriptionRu: 'Геймерский монстр CyberPhone Mech-X с полупрозрачной крышкой, светящимися дорожками и медным радиатором.'
      },
      {
        legacyItemId: 'phone_cyber_white',
        colorKey: 'white',
        colorNameRu: 'Меха-Белый',
        colorHex: '#f8fafc',
        accentHex: '#f97316',
        descriptionRu: 'CyberPhone Mech-X в стиле научно-фантастических роботов меха: белый карбон и оранжевые маркеры.'
      },
      {
        legacyItemId: 'phone_cyber_neon',
        colorKey: 'neon',
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
    chassisStyle: 'compact',
    materialRu: 'Алюминиевая рама и софт-тач ударопрочный поликарбонат',
    formFactorRu: 'Компактный карманный моноблок',
    dimensionsRu: '146.5 × 68.1 × 8.8 мм',
    weightGrams: 172,
    volumeL: 0.15,
    ingressProtectionRu: 'IP65',
    cpuBrand: 'MediaTek',
    cpuModel: 'Helio G99 Ultra 2.2 ГГц (8 ядер Energy Saver)',
    cpuFrequencyGhz: 2.2,
    cpuCores: 8,
    cpuProcessNm: 6,
    ramBrand: 'Micron',
    ramType: 'LPDDR4X',
    ramGb: 8,
    storageBrand: 'Western Digital',
    storageType: 'UFS 2.2',
    storageGb: 128,
    batteryBrand: 'CosMX',
    batteryCapacityMah: 3800,
    batteryChargingW: 30,
    displayBrand: 'Visionox',
    displayPanelType: 'OLED 120 Гц',
    displayResolution: '2400 × 1080',
    displayRefreshHz: 120,
    screenSizeInches: 5.9,
    cameraBrand: 'Sony IMX',
    cameraMegaPixels: 48,
    cameraSpecs: '48 MP AI Dual Lens + Super HDR',
    modemModel: 'Helio 5G/LTE Multi-Band + Wi-Fi 6',
    networkType: '5G',
    chargingPortType: 'USB-C 2.0 (30 Вт PD)',
    osName: 'NeoClean OS',
    osVersion: '4.0',
    basePrice: 42000,
    colors: [
      {
        legacyItemId: 'phone_compact_navy',
        colorKey: 'navy',
        colorNameRu: 'Морской Индиго',
        colorHex: '#1e3a5f',
        accentHex: '#60a5fa',
        descriptionRu: 'Удобный компактный эргономичный смартфон в глубоком матовом синем цвете индиго.'
      },
      {
        legacyItemId: 'phone_compact_gray',
        colorKey: 'gray',
        colorNameRu: 'Штормовой Базальт',
        colorHex: '#4b5563',
        accentHex: '#9ca3af',
        descriptionRu: 'Neo Compact в практичном сером противоударном поликарбонатном корпусе софт-тач.'
      },
      {
        legacyItemId: 'phone_compact_coral',
        colorKey: 'coral',
        colorNameRu: 'Солнечный Коралл',
        colorHex: '#d97706',
        accentHex: '#fbbf24',
        descriptionRu: 'Neo Compact в ярком теплом кораллово-янтарном цвете, устойчивом к отпечаткам.'
      }
    ]
  },
  nova_ultra: {
    modelId: 'nova_ultra',
    seriesName: 'Nova 15 Ultra',
    modelName: 'Nova 15 Ultra Flagship',
    brand: 'Nova Star',
    chassisStyle: 'nova',
    materialRu: 'Полированный титан, керамическая задняя панель Star Orbit',
    formFactorRu: 'Флагманский камерофон с кольцевым блоком',
    dimensionsRu: '163.2 × 75.9 × 8.7 мм',
    weightGrams: 224,
    volumeL: 0.18,
    ingressProtectionRu: 'IP68',
    cpuBrand: 'Qualcomm',
    cpuModel: 'Snapdragon 8 Elite 4.2 ГГц (8 ядер)',
    cpuFrequencyGhz: 4.2,
    cpuCores: 8,
    cpuProcessNm: 3,
    ramBrand: 'SK Hynix',
    ramType: 'LPDDR5X',
    ramGb: 16,
    storageBrand: 'Kioxia',
    storageType: 'UFS 4.0',
    storageGb: 512,
    batteryBrand: 'ATL Silicon-Carbon',
    batteryCapacityMah: 5500,
    batteryChargingW: 90,
    displayBrand: 'TCL CSOT',
    displayPanelType: 'LTPO AMOLED 120 Гц',
    displayResolution: '3200 × 1440',
    displayRefreshHz: 120,
    screenSizeInches: 6.8,
    cameraBrand: 'Sony LYTIA',
    cameraMegaPixels: 200,
    cameraSpecs: '200 MP Star Orbit OIS + 50 MP Periscope + 50 MP Ultra-Wide',
    modemModel: 'Snapdragon X75 5G + Спутниковый модуль',
    networkType: '5G',
    chargingPortType: 'USB-C 3.2 Gen 2 (90 Вт Turbo)',
    osName: 'StarOS',
    osVersion: '15.1',
    basePrice: 120000,
    colors: [
      {
        legacyItemId: 'phone_nova15',
        colorKey: 'amethyst',
        colorNameRu: 'Звёздный Пурпур',
        colorHex: '#581c87',
        accentHex: '#c084fc',
        cameraPlateColor: '#3b0764',
        descriptionRu: 'Премиальный флагман с 6.8" 120 Гц дисплеем, 200 МП камерой в кольце Star Orbit и спутниковой связью.'
      }
    ]
  },
  cyber_fold: {
    modelId: 'cyber_fold',
    seriesName: 'CyberFold Neo',
    modelName: 'CyberFold Neo Dual-Screen',
    brand: 'HyperMech',
    chassisStyle: 'fold',
    materialRu: 'Титановый шарнир, матовый алюминий, гибкое ультратонкое стекло UTG',
    formFactorRu: 'Складной смартфон-книжка (Fold)',
    dimensionsRu: '155.1 × 130.1 × 5.8 мм (в разложенном виде)',
    weightGrams: 254,
    volumeL: 0.22,
    ingressProtectionRu: 'IPX8',
    cpuBrand: 'Qualcomm',
    cpuModel: 'Snapdragon 8 Gen 3 Leading 3.4 ГГц (8 ядер)',
    cpuFrequencyGhz: 3.4,
    cpuCores: 8,
    cpuProcessNm: 4,
    ramBrand: 'Samsung Semiconductor',
    ramType: 'LPDDR5X',
    ramGb: 16,
    storageBrand: 'Samsung Semiconductor',
    storageType: 'UFS 4.0',
    storageGb: 512,
    batteryBrand: 'SDI Dual-Cell',
    batteryCapacityMah: 4800,
    batteryChargingW: 45,
    displayBrand: 'Samsung Display',
    displayPanelType: 'Гибкий Foldable LTPO AMOLED',
    displayResolution: '2160 × 1856',
    displayRefreshHz: 120,
    screenSizeInches: 7.6,
    cameraBrand: 'Sony Semiconductor',
    cameraMegaPixels: 50,
    cameraSpecs: '50 MP OIS + 12 MP Ultra-Wide + 10 MP 3x Telephoto',
    modemModel: 'Snapdragon X75 5G + Wi-Fi 7',
    networkType: '5G',
    chargingPortType: 'USB-C 3.2 (45 Вт PD)',
    osName: 'FoldUI Pro',
    osVersion: '6.2',
    basePrice: 145000,
    colors: [
      {
        legacyItemId: 'phone_fold',
        colorKey: 'obsidian_gold',
        colorNameRu: 'Обсидиан и Янтарный Шарнир',
        colorHex: '#18181b',
        accentHex: '#f59e0b',
        cameraPlateColor: '#09090b',
        descriptionRu: 'Футуристический раскладной гибкий смартфон с титановым шарниром и двойным AMOLED-дисплеем.'
      }
    ]
  },
  nord_lite: {
    modelId: 'nord_lite',
    seriesName: 'Nord Lite 5G',
    modelName: 'Nord Lite 5G Emerald',
    brand: 'Nordic Neo',
    chassisStyle: 'nord',
    materialRu: 'Анодированный алюминий и матовый композитный пластик',
    formFactorRu: 'Тонкий смартфон-моноблок',
    dimensionsRu: '158.9 × 73.5 × 8.1 мм',
    weightGrams: 184,
    volumeL: 0.16,
    ingressProtectionRu: 'IP54',
    cpuBrand: 'Qualcomm',
    cpuModel: 'Snapdragon 7s Gen 2 2.4 ГГц (8 ядер)',
    cpuFrequencyGhz: 2.4,
    cpuCores: 8,
    cpuProcessNm: 4,
    ramBrand: 'Micron',
    ramType: 'LPDDR5',
    ramGb: 8,
    storageBrand: 'Kioxia',
    storageType: 'UFS 3.1',
    storageGb: 256,
    batteryBrand: 'ATL Power',
    batteryCapacityMah: 5000,
    batteryChargingW: 67,
    displayBrand: 'BOE Display',
    displayPanelType: 'AMOLED 90 Гц',
    displayResolution: '2400 × 1080',
    displayRefreshHz: 90,
    screenSizeInches: 6.55,
    cameraBrand: 'Sony IMX',
    cameraMegaPixels: 64,
    cameraSpecs: '64 MP OIS + 8 MP Ultra-Wide + 2 MP Macro',
    modemModel: 'Snapdragon X62 5G + Wi-Fi 6',
    networkType: '5G',
    chargingPortType: 'USB-C 2.0 (67 Вт FastCharge)',
    osName: 'NordOS',
    osVersion: '14.2',
    basePrice: 38000,
    colors: [
      {
        legacyItemId: 'phone_nord',
        colorKey: 'emerald',
        colorNameRu: 'Скандинавская Бирюза',
        colorHex: '#0f766e',
        accentHex: '#2dd4bf',
        descriptionRu: 'Стильный скандинавский смартфон бирюзового оттенка с 90 Гц AMOLED дисплеем и тройной камерой.'
      }
    ]
  },
  retro_classic: {
    modelId: 'retro_classic',
    seriesName: 'Matrix Classic',
    modelName: 'Matrix Classic 3310 Keypad',
    brand: 'Matrix Telecom',
    chassisStyle: 'retro',
    materialRu: 'Ударопрочный толстостенный ABS-поликарбонат, резиновые кнопки T9',
    formFactorRu: 'Кнопочный моноблок с внешней антенной',
    dimensionsRu: '113.0 × 48.0 × 22.0 мм',
    weightGrams: 133,
    volumeL: 0.12,
    ingressProtectionRu: 'Ударопрочный корпус IP52',
    cpuBrand: 'ARM Classic',
    cpuModel: 'Matrix Baseband MCU 0.2 ГГц (1 ядро)',
    cpuFrequencyGhz: 0.2,
    cpuCores: 1,
    cpuProcessNm: 65,
    ramBrand: 'Winbond',
    ramType: 'SRAM / SDRAM',
    ramGb: 0.064,
    storageBrand: 'Winbond',
    storageType: 'NOR Flash (eMMC)',
    storageGb: 0.128,
    batteryBrand: 'Matrix Cell',
    batteryCapacityMah: 1450,
    batteryChargingW: 5,
    displayBrand: 'Sharp LCD',
    displayPanelType: 'Монохромный STN LCD с зелёной подсветкой',
    displayResolution: '84 × 48',
    displayRefreshHz: 60,
    screenSizeInches: 1.8,
    cameraBrand: 'Нет (только LED-фонарик)',
    cameraMegaPixels: 0,
    cameraSpecs: 'Без камеры (встроенный LED-фонарик)',
    modemModel: 'GSM/LTE Dual-SIM Voice/SMS',
    networkType: '4G',
    chargingPortType: 'Micro-USB / 2.5 мм DC (5 Вт)',
    osName: 'MatrixOS',
    osVersion: '3.3',
    basePrice: 3500,
    colors: [
      {
        legacyItemId: 'phone_retro',
        colorKey: 'slate',
        colorNameRu: 'Армейский Графит',
        colorHex: '#334155',
        accentHex: '#22c55e',
        descriptionRu: 'Неубиваемый кнопочный телефон с монохромным экраном, фонариком и недельной батареей.'
      }
    ]
  }
};

export function buildPhoneComponentsForModel(model: PhoneModelTemplate): InstalledHardwareComponent[] {
  const isRetro = model.chassisStyle === 'retro';
  const isFold = model.chassisStyle === 'fold';

  const displayAttrs: HardwareComponentAttributes = {
    kind: 'hw_display',
    nameRu: `${model.displayPanelType} ${model.screenSizeInches}"`,
    brand: model.displayBrand,
    model: `${model.seriesName.replace(/\s+/g, '-')}-DISP-${model.displayRefreshHz}Hz`,
    materialRu: isRetro
      ? 'Акриловое защитное стекло, монохромная ЖК-матрица STN, зелёные светодиоды'
      : isFold
      ? 'Ультратонкое гибкое стекло UTG, полиимидная AMOLED-подложка, шлейф FPC'
      : 'Закалённое стекло, органическая OLED/AMOLED матрица, медный шлейф FPC',
    connectorRu: isRetro ? 'Токопроводящая резинка (эластомер Zebra)' : 'Гибкий шлейф FPC MIPI DSI (40-pin B2B)',
    colorHex: isRetro ? '#15803d' : '#0f172a',
    colorRgb: hexToRgb(isRetro ? '#15803d' : '#0f172a'),
    colorNameRu: isRetro ? 'Зелёный монохром' : 'Чёрный антиблик',
    accentHex: isRetro ? '#86efac' : '#d97706',
    dimensionsRu: isRetro
      ? '42 × 32 × 2.4 мм (1.8")'
      : `${Math.round(model.screenSizeInches * 23)} × ${Math.round(model.screenSizeInches * 10.7)} × 1.8 мм (${model.screenSizeInches}")`,
    formFactorRu: isFold ? `Складной дисплей ${model.screenSizeInches}"` : `Экранный модуль ${model.screenSizeInches}"`,
    weightGrams: isRetro ? 14 : isFold ? 58 : 40,
    volumeL: isRetro ? 0.006 : 0.02,
    specsSummaryRu: `${model.screenSizeInches}" ${model.displayPanelType} · ${model.displayResolution} · ${model.displayRefreshHz} Гц`,
    specs: {
      'Диагональ': `${model.screenSizeInches}"`,
      'Тип панели': model.displayPanelType,
      'Разрешение': `${model.displayResolution} px`,
      'Частота': `${model.displayRefreshHz} Гц`
    },
    compatibilityRu: `Серия ${model.seriesName}`
  };

  const cpuAttrs: HardwareComponentAttributes = {
    kind: 'hw_cpu',
    nameRu: `Процессор ${model.cpuModel.split('(')[0].trim()}`,
    brand: model.cpuBrand,
    model: model.cpuModel.split('(')[0].trim(),
    materialRu: `Монокристаллический кремний (${model.cpuProcessNm} нм), текстолитовая подложка, золотые контакты`,
    connectorRu: isRetro ? 'Поверхностный монтаж QFP-128' : 'Пайка BGA (FBGA PoP)',
    colorHex: '#1e293b',
    colorRgb: hexToRgb('#1e293b'),
    colorNameRu: 'Графитовый кремний',
    accentHex: '#eab308',
    dimensionsRu: isRetro ? '14.0 × 14.0 × 1.4 мм' : '11.4 × 10.8 × 1.1 мм',
    formFactorRu: isRetro ? 'Микроконтроллер QFP-128' : 'Чип SoC FBGA',
    weightGrams: 4,
    volumeL: 0.002,
    specsSummaryRu: `${model.cpuCores} ядер · ${model.cpuFrequencyGhz} ГГц · ${model.cpuProcessNm} нм`,
    specs: {
      'Модель': model.cpuModel,
      'Ядра': model.cpuCores,
      'Частота': `${model.cpuFrequencyGhz} ГГц`,
      'Техпроцесс': `${model.cpuProcessNm} нм`
    },
    compatibilityRu: `Системные платы ${model.brand}`
  };

  const ramLabel = model.ramGb >= 1 ? `${model.ramGb} ГБ` : `${Math.round(model.ramGb * 1024)} МБ`;
  const ramAttrs: HardwareComponentAttributes = {
    kind: 'hw_ram',
    nameRu: `Оперативная память ${ramLabel} ${model.ramType}`,
    brand: model.ramBrand,
    model: `${model.ramBrand.split(' ')[0]}-${model.ramType}-${ramLabel.replace(/\s+/g, '')}`,
    materialRu: 'Кремниевые кристаллы DRAM, чёрный эпоксидный компаунд, контактные шары BGA',
    connectorRu: isRetro ? 'Пайка TSOP-48 на плату' : 'Пайка PoP BGA-496 (поверх SoC)',
    colorHex: '#18181b',
    colorRgb: hexToRgb('#18181b'),
    colorNameRu: 'Чёрный эпоксидный компаунд',
    accentHex: '#38bdf8',
    dimensionsRu: '12.4 × 15.0 × 0.8 мм',
    formFactorRu: `Чип ${model.ramType}`,
    weightGrams: 2,
    volumeL: 0.001,
    specsSummaryRu: `${ramLabel} · ${model.ramType}`,
    specs: {
      'Объём': ramLabel,
      'Стандарт': model.ramType,
      'Монтаж': isRetro ? 'TSOP-48' : 'PoP BGA'
    },
    compatibilityRu: `Платформа ${model.brand}`
  };

  const storageLabel = model.storageGb >= 1024
    ? `${Number((model.storageGb / 1024).toFixed(1))} ТБ`
    : model.storageGb >= 1
    ? `${model.storageGb} ГБ`
    : `${Math.round(model.storageGb * 1024)} МБ`;
  const ssdAttrs: HardwareComponentAttributes = {
    kind: 'hw_ssd',
    nameRu: `Флеш-накопитель ${storageLabel} (${model.storageType})`,
    brand: model.storageBrand,
    model: `${model.storageBrand.split(' ')[0]}-${model.storageType.replace(/[^A-Za-z0-9]/g, '')}-${storageLabel.replace(/\s+/g, '')}`,
    materialRu: 'Стеклотекстолит FR-4, кристаллы 3D NAND, контроллер памяти, медная термофольга',
    connectorRu: isRetro ? 'Пайка SOIC-16 (SPI NOR)' : 'Пайка BGA-153 (шина UFS / NVMe)',
    colorHex: '#14532d',
    colorRgb: hexToRgb('#14532d'),
    colorNameRu: 'Тёмно-зелёный текстолит',
    accentHex: '#f59e0b',
    dimensionsRu: '11.5 × 13.0 × 1.0 мм',
    formFactorRu: `Флеш-модуль ${model.storageType}`,
    weightGrams: 3,
    volumeL: 0.002,
    specsSummaryRu: `${storageLabel} · ${model.storageType}`,
    specs: {
      'Объём': storageLabel,
      'Интерфейс': model.storageType,
      'Тип': isRetro ? 'NOR Flash' : '3D TLC NAND'
    },
    compatibilityRu: `Мобильные устройства ${model.brand}`
  };

  const batteryWh = Number(((model.batteryCapacityMah * 3.85) / 1000).toFixed(1));
  const batteryAttrs: HardwareComponentAttributes = {
    kind: 'hw_battery',
    nameRu: `Аккумулятор ${model.batteryCapacityMah} мА·ч`,
    brand: model.batteryBrand,
    model: `${model.modelId.toUpperCase()}-BAT-${model.batteryCapacityMah}`,
    materialRu: isRetro
      ? 'Съёмная литий-ионная ячейка в пластиковом корпусе, медные площадки'
      : 'Литий-полимерная ячейка, алюминиево-ламинатная оболочка, контроллер BMS',
    connectorRu: isRetro ? 'Пружинные контактные площадки (3-pin, съёмная)' : 'Шлейф FPC с разъёмом B2B (4-pin)',
    colorHex: '#1f2937',
    colorRgb: hexToRgb('#1f2937'),
    colorNameRu: 'Графитовый чёрный',
    accentHex: '#fbbf24',
    dimensionsRu: isRetro ? '53 × 34 × 5.5 мм' : '84 × 56 × 4.6 мм',
    formFactorRu: isRetro ? 'Съёмная Li-Ion ячейка' : 'Призматическая Li-Pol ячейка',
    weightGrams: Math.max(24, Math.round(model.batteryCapacityMah * 0.0135)),
    volumeL: isRetro ? 0.01 : 0.022,
    specsSummaryRu: `${model.batteryCapacityMah} мА·ч · ${batteryWh} Вт·ч · Зарядка ${model.batteryChargingW} Вт`,
    specs: {
      'Ёмкость': `${model.batteryCapacityMah} мА·ч`,
      'Энергия': `${batteryWh} Вт·ч`,
      'Напряжение': '3.85 В',
      'Мощность зарядки': `${model.batteryChargingW} Вт`
    },
    compatibilityRu: `Модель ${model.modelName}`
  };

  const mbAttrs: HardwareComponentAttributes = {
    kind: 'hw_motherboard',
    nameRu: `Системная плата ${model.seriesName}`,
    brand: `${model.brand} PCB`,
    model: `MB-${model.modelId.toUpperCase()}-REV3`,
    materialRu: isRetro
      ? '4-слойный текстолит FR-4, медные дорожки, контактные площадки клавиатуры'
      : '12-слойный стеклотекстолит FR-4 HDI, медная разводка, стальные EMI-экраны',
    connectorRu: 'Винтовое крепление M1.2 + разъёмы B2B/FPC и коаксиальные I-PEX',
    colorHex: '#064e3b',
    colorRgb: hexToRgb('#064e3b'),
    colorNameRu: 'Изумрудная паяльная маска',
    accentHex: '#eab308',
    dimensionsRu: isRetro ? '98 × 40 × 1.6 мм' : '92 × 48 × 2.6 мм',
    formFactorRu: isRetro ? 'Однослойная плата T9' : 'Двухэтажная HDI PCB',
    weightGrams: isRetro ? 18 : 24,
    volumeL: 0.012,
    specsSummaryRu: `${isRetro ? '4 слоя FR-4' : '12 слоёв HDI'} · PMIC · Датчики`,
    specs: {
      'Слои': isRetro ? '4 слоя FR-4' : '12 слоёв HDI',
      'Совместимый SoC': model.cpuModel.split('(')[0].trim(),
      'ОС': `${model.osName} ${model.osVersion}`
    },
    compatibilityRu: `Шасси ${model.modelName}`
  };

  const modemAttrs: HardwareComponentAttributes = {
    kind: 'hw_modem',
    nameRu: `Радиомодуль ${model.networkType}`,
    brand: model.modemModel.split(' ')[0],
    model: model.modemModel,
    materialRu: 'Кремниевый RF-трансивер, керамические фильтры, экранированный корпус',
    connectorRu: 'Пайка BGA + коаксиальные антенные разъёмы MHF4',
    colorHex: '#334155',
    colorRgb: hexToRgb('#334155'),
    colorNameRu: 'Матовый стальной экран',
    accentHex: '#38bdf8',
    dimensionsRu: '14 × 12 × 1.3 мм',
    formFactorRu: 'RF-модуль BGA',
    weightGrams: 5,
    volumeL: 0.002,
    specsSummaryRu: `${model.modemModel} (${model.networkType})`,
    specs: {
      'Сеть': model.networkType,
      'Модель': model.modemModel
    },
    compatibilityRu: `Системные платы ${model.brand}`
  };

  const speakerAttrs: HardwareComponentAttributes = {
    kind: 'hw_speaker',
    nameRu: isRetro ? 'Разговорный динамик и зуммер' : 'Стереодинамик и вибромотор',
    brand: 'AAC Acoustics',
    model: isRetro ? 'Buzzer-8R' : `StereoBox-${model.modelId.toUpperCase()}`,
    materialRu: 'Поликарбонатный резонатор, неодимовый магнит, медная катушка',
    connectorRu: 'Пружинные контакты Pogo-pin / шлейф FPC 4-pin',
    colorHex: '#27272a',
    colorRgb: hexToRgb('#27272a'),
    colorNameRu: 'Антрацитовый полимер',
    accentHex: '#b45309',
    dimensionsRu: isRetro ? '16 × 10 × 3.0 мм' : '28 × 14 × 3.8 мм',
    formFactorRu: 'Акустический модуль Box',
    weightGrams: isRetro ? 5 : 9,
    volumeL: 0.003,
    specsSummaryRu: isRetro ? '0.8 Вт · Моно-зуммер + роторный вибромотор' : '1.8 Вт · Стерео + линейный вибропривод',
    specs: {
      'Мощность': isRetro ? '0.8 Вт' : '1.8 Вт',
      'Вибромотор': isRetro ? 'Роторный ERM' : 'Линейный X-Axis'
    },
    compatibilityRu: `Модель ${model.seriesName}`
  };

  const portAttrs: HardwareComponentAttributes = {
    kind: 'hw_charging_port',
    nameRu: `Разъём питания ${model.chargingPortType.split('(')[0].trim()}`,
    brand: 'Amphenol Mobile',
    model: `PORT-${model.modelId.toUpperCase()}`,
    materialRu: 'Никелированный стальной экран, позолоченные медные контакты, шлейф FPC',
    connectorRu: `Разъём B2B (24-pin) к плате + внешний ${model.chargingPortType.split('(')[0].trim()}`,
    colorHex: '#3f3f46',
    colorRgb: hexToRgb('#3f3f46'),
    colorNameRu: 'Никель и медный шлейф',
    accentHex: '#d97706',
    dimensionsRu: '36 × 16 × 3.2 мм',
    formFactorRu: 'Шлейф порта зарядки',
    weightGrams: 6,
    volumeL: 0.002,
    specsSummaryRu: `${model.chargingPortType} · до ${model.batteryChargingW} Вт`,
    specs: {
      'Разъём': model.chargingPortType,
      'Макс. мощность': `${model.batteryChargingW} Вт`
    },
    compatibilityRu: `Серия ${model.seriesName}`
  };

  const components: InstalledHardwareComponent[] = [
    { slot: 'display', slotNameRu: 'Дисплей', itemId: 'hw_display', attributes: displayAttrs },
    { slot: 'cpu', slotNameRu: 'Процессор (CPU/SoC)', itemId: 'hw_cpu', attributes: cpuAttrs },
    { slot: 'ram', slotNameRu: 'Оперативная память (RAM)', itemId: 'hw_ram', attributes: ramAttrs },
    { slot: 'storage', slotNameRu: 'Накопитель (SSD/Flash)', itemId: 'hw_ssd', attributes: ssdAttrs },
    { slot: 'battery', slotNameRu: 'Аккумулятор', itemId: 'hw_battery', attributes: batteryAttrs },
    { slot: 'motherboard', slotNameRu: 'Системная плата', itemId: 'hw_motherboard', attributes: mbAttrs }
  ];

  if (!isRetro) {
    const cameraAttrs: HardwareComponentAttributes = {
      kind: 'hw_camera',
      nameRu: `Оптический блок камер ${model.cameraMegaPixels} МП`,
      brand: model.cameraBrand,
      model: `CAM-${model.modelId.toUpperCase()}-${model.cameraMegaPixels}MP`,
      materialRu: 'Алюминиевая рама, сапфировые линзы, CMOS-сенсоры, магнитный OIS',
      connectorRu: 'Гибкий шлейф FPC MIPI CSI-2 (34-pin)',
      colorHex: '#111827',
      colorRgb: hexToRgb('#111827'),
      colorNameRu: 'Чёрный оптический анод',
      accentHex: '#0284c7',
      dimensionsRu: '31 × 30 × 6.8 мм',
      formFactorRu: 'Мультимодуль OIS',
      weightGrams: 18,
      volumeL: 0.007,
      specsSummaryRu: model.cameraSpecs,
      specs: {
        'Основной сенсор': `${model.cameraMegaPixels} МП`,
        'Конфигурация': model.cameraSpecs
      },
      compatibilityRu: `Серия ${model.seriesName}`
    };
    components.push({ slot: 'camera', slotNameRu: 'Модуль камеры', itemId: 'hw_camera', attributes: cameraAttrs });
  }

  components.push(
    { slot: 'modem', slotNameRu: 'Модем / Радиомодуль', itemId: 'hw_modem', attributes: modemAttrs },
    { slot: 'speaker', slotNameRu: 'Динамик / Вибромотор', itemId: 'hw_speaker', attributes: speakerAttrs },
    { slot: 'charging_port', slotNameRu: 'Разъём питания', itemId: 'hw_charging_port', attributes: portAttrs }
  );

  return components;
}

// =========================================================================
// LEGACY PHONE PRESETS (seamless save & shop migration -> unified 'phone')
// =========================================================================
export interface LegacyPhonePresetRef {
  modelId: string;
  colorIndex: number;
}

export const LEGACY_PHONE_PRESETS: Record<string, LegacyPhonePresetRef> = {
  smartphone: { modelId: 'aura_pro', colorIndex: 0 },
  phone_aura_pro_black: { modelId: 'aura_pro', colorIndex: 0 },
  phone_aura_pro_gold: { modelId: 'aura_pro', colorIndex: 1 },
  phone_aura_pro_titanium: { modelId: 'aura_pro', colorIndex: 2 },
  phone_aura_pro_blue: { modelId: 'aura_pro', colorIndex: 3 },
  phone_quantum_black: { modelId: 'quantum_ultra', colorIndex: 0 },
  phone_quantum_silver: { modelId: 'quantum_ultra', colorIndex: 1 },
  phone_quantum_emerald: { modelId: 'quantum_ultra', colorIndex: 2 },
  phone_quantum_violet: { modelId: 'quantum_ultra', colorIndex: 3 },
  phone_pixel_obsidian: { modelId: 'pixel_nova', colorIndex: 0 },
  phone_pixel_porcelain: { modelId: 'pixel_nova', colorIndex: 1 },
  phone_pixel_hazel: { modelId: 'pixel_nova', colorIndex: 2 },
  phone_pixel_rose: { modelId: 'pixel_nova', colorIndex: 3 },
  phone_pixel: { modelId: 'pixel_nova', colorIndex: 0 },
  phone_cyber_dark: { modelId: 'cyber_mech', colorIndex: 0 },
  phone_cyber_white: { modelId: 'cyber_mech', colorIndex: 1 },
  phone_cyber_neon: { modelId: 'cyber_mech', colorIndex: 2 },
  phone_compact_navy: { modelId: 'neo_compact', colorIndex: 0 },
  phone_compact_gray: { modelId: 'neo_compact', colorIndex: 1 },
  phone_compact_coral: { modelId: 'neo_compact', colorIndex: 2 },
  phone_nova15: { modelId: 'nova_ultra', colorIndex: 0 },
  phone_fold: { modelId: 'cyber_fold', colorIndex: 0 },
  phone_nord: { modelId: 'nord_lite', colorIndex: 0 },
  phone_retro: { modelId: 'retro_classic', colorIndex: 0 }
};

export function buildPhoneAttributes(
  presetOrModelId: string = 'aura_pro',
  overrides?: Partial<PhoneAttributes>
): PhoneAttributes {
  const legacyRef = LEGACY_PHONE_PRESETS[presetOrModelId];
  const modelId = overrides?.modelId || legacyRef?.modelId || (PHONE_MODELS[presetOrModelId] ? presetOrModelId : 'aura_pro');
  const model = PHONE_MODELS[modelId] || PHONE_MODELS.aura_pro;
  const colorPreset = model.colors[legacyRef?.colorIndex ?? 0] || model.colors[0];

  const colorHex = overrides?.colorHex || colorPreset.colorHex;
  const colorRgb = overrides?.colorRgb ? { ...overrides.colorRgb } : hexToRgb(colorHex);
  const components = overrides?.components && overrides.components.length > 0
    ? overrides.components.map(c => ({
        ...c,
        attributes: {
          ...c.attributes,
          colorRgb: c.attributes.colorRgb ? { ...c.attributes.colorRgb } : hexToRgb(c.attributes.colorHex),
          specs: { ...(c.attributes.specs || {}) }
        }
      }))
    : buildPhoneComponentsForModel(model);

  return {
    brand: overrides?.brand || model.brand,
    seriesName: overrides?.seriesName || model.seriesName,
    modelName: overrides?.modelName || model.modelName,
    modelId: model.modelId,
    chassisStyle: overrides?.chassisStyle || model.chassisStyle,
    colorHex,
    colorRgb,
    colorNameRu: overrides?.colorNameRu || colorPreset.colorNameRu,
    accentHex: overrides?.accentHex || colorPreset.accentHex,
    cameraPlateColor: overrides?.cameraPlateColor ?? colorPreset.cameraPlateColor,
    materialRu: overrides?.materialRu || model.materialRu,
    formFactorRu: overrides?.formFactorRu || model.formFactorRu,
    dimensionsRu: overrides?.dimensionsRu || model.dimensionsRu,
    weightGrams: overrides?.weightGrams ?? model.weightGrams,
    volumeL: overrides?.volumeL ?? model.volumeL,
    ingressProtectionRu: overrides?.ingressProtectionRu ?? model.ingressProtectionRu,
    osName: overrides?.osName || model.osName,
    osVersion: overrides?.osVersion || model.osVersion,
    components
  };
}

export function derivePhoneSpecsFromAttributes(
  attrs: PhoneAttributes,
  existing?: Partial<PhoneSpecs>
): PhoneSpecs {
  const model = PHONE_MODELS[attrs.modelId] || PHONE_MODELS.aura_pro;
  const compBySlot = (slot: string) => attrs.components?.find(c => c.slot === slot);
  const cpuComp = compBySlot('cpu');
  const ramComp = compBySlot('ram');
  const storageComp = compBySlot('storage');
  const batComp = compBySlot('battery');
  const dispComp = compBySlot('display');
  const camComp = compBySlot('camera');

  const parseNum = (v: unknown, fallback: number): number => {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const m = v.replace(',', '.').match(/[\d.]+/);
      if (m) {
        const n = parseFloat(m[0]);
        if (!Number.isNaN(n)) return n;
      }
    }
    return fallback;
  };

  const cpuModel = (cpuComp?.attributes.specs?.['Модель'] as string) || cpuComp?.attributes.model || model.cpuModel;
  const cpuFrequencyGhz = parseNum(cpuComp?.attributes.specs?.['Частота'], model.cpuFrequencyGhz);
  const cpuCores = Math.round(parseNum(cpuComp?.attributes.specs?.['Ядра'], model.cpuCores));
  const rawRamStr = String(ramComp?.attributes.specs?.['Объём'] ?? '');
  const ramGb = rawRamStr.includes('МБ')
    ? Number((parseNum(rawRamStr, 64) / 1024).toFixed(3))
    : parseNum(rawRamStr, model.ramGb);
  const rawStorStr = String(storageComp?.attributes.specs?.['Объём'] ?? '');
  const storageGb = rawStorStr.includes('ТБ')
    ? Math.round(parseNum(rawStorStr, 1) * 1024)
    : rawStorStr.includes('МБ')
    ? Number((parseNum(rawStorStr, 128) / 1024).toFixed(3))
    : parseNum(rawStorStr, model.storageGb);
  const batteryCapacityMah = Math.round(parseNum(batComp?.attributes.specs?.['Ёмкость'], model.batteryCapacityMah));
  const screenSizeInches = parseNum(dispComp?.attributes.specs?.['Диагональ'], model.screenSizeInches);
  const refreshRateHz = Math.round(parseNum(dispComp?.attributes.specs?.['Частота'], model.displayRefreshHz));
  const cameraMegaPixels = camComp ? Math.round(parseNum(camComp.attributes.specs?.['Основной сенсор'], model.cameraMegaPixels)) : model.cameraMegaPixels;
  const cameraSpecs = camComp?.attributes.specsSummaryRu || model.cameraSpecs;

  return {
    modelId: attrs.modelId,
    modelName: attrs.modelName,
    seriesName: attrs.seriesName,
    brand: attrs.brand,
    colorNameRu: attrs.colorNameRu,
    colorHex: attrs.colorHex,
    accentHex: attrs.accentHex,
    storageGb,
    storageUsedGb: existing?.storageUsedGb ?? Math.round(storageGb * 0.18 * 10) / 10,
    cpuModel,
    cpuFrequencyGhz,
    cpuCores,
    ramGb,
    ramUsedGb: existing?.ramUsedGb ?? Math.round(ramGb * 0.35 * 10) / 10,
    batteryCapacityMah,
    batteryLevelPct: existing?.batteryLevelPct ?? 88,
    isPoweredOn: existing?.isPoweredOn ?? true,
    flashlightOn: existing?.flashlightOn ?? false,
    wallpaperId: existing?.wallpaperId ?? 'wallpaper_aurora',
    osName: attrs.osName,
    osVersion: attrs.osVersion,
    screenSizeInches,
    screenSize: `${screenSizeInches}"`,
    refreshRateHz,
    cameraMegaPixels,
    cameraSpecs,
    networkType: existing?.networkType ?? model.networkType,
    signalStrength: existing?.signalStrength ?? 4,
    airplaneMode: existing?.airplaneMode ?? false,
    wifiConnected: existing?.wifiConnected ?? true,
    bluetoothConnected: existing?.bluetoothConnected ?? true,
    notes: existing?.notes ?? [
      'Купить свежее моторное масло 5W-40 в PIT-STOP',
      'Проверить уровень тормозной жидкости и давление в шинах',
      'Код от домофона в квартире: 384К'
    ],
    unreadSmsCount: existing?.unreadSmsCount ?? 2
  };
}

export function getPhoneSpecsForItemId(itemId: string): PhoneSpecs {
  const attrs = buildPhoneAttributes(itemId);
  return derivePhoneSpecsFromAttributes(attrs);
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
    id: 'wallpaper_flatbody',
    nameRu: 'Янтарный Горизонт (flatbody)',
    previewGradient: 'from-amber-950 via-stone-900 to-neutral-950',
    cssBackground: 'linear-gradient(180deg, #17140f 0%, #2b2218 58%, #120f0b 100%)'
  },
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

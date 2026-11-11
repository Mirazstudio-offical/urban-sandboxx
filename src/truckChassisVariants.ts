import { FluidStorageTank } from './types';

export type TruckPlatformId = 'gaz53' | 'zil130' | 'zil4331' | 'kamaz';

export type FrameMountType =
  | 'fifth_wheel'      // Крепление седельно-сцепного устройства (ССУ тягача)
  | 'short_tipper'     // Короткобазный самосвальный подрамник с опорой гидроцилиндра (ЦОМ)
  | 'medium_subframe'  // Среднебазный грузовой лонжеронный подрамник (стремянки и кронштейны)
  | 'long_subframe'    // Длиннобазный грузовой подрамник увеличенной длины
  | 'municipal_pto'    // Коммунальное шасси с КОМ (коробкой отбора мощности) и гидровыводами
  | 'heavy_tandem'     // Усиленная балансирная тележка под тяжёлые спецнадстройки
  | 'fire_special';    // Спецшасси с полнопоточной КОМ под пожарные надстройки

export const MOUNT_TYPE_LABELS_RU: Record<FrameMountType, string> = {
  fifth_wheel: 'Седельное (ССУ)',
  short_tipper: 'Самосвальная цапфа + КОМ',
  medium_subframe: 'Стандартный подрамник',
  long_subframe: 'Длиннобазный подрамник',
  municipal_pto: 'Коммунальная КОМ + гидролинии',
  heavy_tandem: 'Тяжёлый тандемный надрамник',
  fire_special: 'Пожарный спецподрамник + КОМ',
};

export type RearTireType = 'single' | 'dual' | 'offroad_single' | 'super_single';
export type WheelFormula = '4x2' | '4x4' | '6x4' | '6x6' | '8x4';

export interface TruckFrameVariant {
  id: string;
  nameRu: string;
  modelCode: string;
  compatiblePlatforms: TruckPlatformId[];
  lengthPx: number;
  wheelBasePx: number;
  frameLengthMm: number;
  wheelbaseMm: string;
  massKg: number;
  payloadCapacityKg: number;
  wheelFormula: WheelFormula;
  axleCount: 2 | 3 | 4;
  rearTireType: RearTireType;
  totalWheels: number;
  tireSpecRu: string;
  mountTypes: FrameMountType[];
  crossmemberCount: number;
  frameColor: string;
  hasFrontDriveAxle: boolean;
  fuelTankCount: 1 | 2;
  spareWheelMount: 'under_rear' | 'frame_side' | 'behind_cab' | 'none';
  fifthWheelOffsetPx: number;
  notes: string;
}

export interface TruckBodyVariant {
  id: string;
  nameRu: string;
  modelCode: string;
  massKg: number;
  /** Frame must have AT LEAST ONE of these mounts (empty array = fits any frame, e.g. bare frame) */
  requiredMounts: FrameMountType[];
  minPayloadKg: number;
  minAxleCount?: 2 | 3 | 4;
  compatiblePlatforms?: TruckPlatformId[];
  /** Maps to the superstructure renderer branch in vehicleVisuals.ts (null = bare frame) */
  attachmentCarType: string | null;
  fluidTankSpec?: FluidStorageTank;
  notes: string;
}

export const TRUCK_PLATFORM_LABELS_RU: Record<TruckPlatformId, string> = {
  gaz53: 'ГАЗ-53',
  zil130: 'ЗИЛ-130',
  zil4331: 'ЗИЛ-4331',
  kamaz: 'КАМАЗ',
};

// ============================================================================
// КАТАЛОГ РАМ ГРУЗОВЫХ ШАССИ (МОДИФИКАТОРЫ РАМЫ)
// ============================================================================

export const TRUCK_FRAME_VARIANTS: TruckFrameVariant[] = [
  // --- РАМЫ ГАЗ-53 ---
  {
    id: 'frm_gaz53_std_3700',
    nameRu: 'Стандартная рама ГАЗ-53-12 (3700 мм)',
    modelCode: '53-12-2800010',
    compatiblePlatforms: ['gaz53'],
    lengthPx: 66,
    wheelBasePx: 43,
    frameLengthMm: 6395,
    wheelbaseMm: '3700 мм',
    massKg: 1180,
    payloadCapacityKg: 4500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (240R508 / 8.25R20, задние двускатные)',
    mountTypes: ['medium_subframe', 'municipal_pto'],
    crossmemberCount: 6,
    frameColor: '#181c24',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -12,
    notes: 'Штампованная клёпаная лонжеронная рама переменного сечения. 6 поперечин, рессорная подвеска с подрессорниками.',
  },
  {
    id: 'frm_gaz53_short_3300',
    nameRu: 'Короткобазная самосвальная рама ГАЗ-САЗ-3507 (3300 мм)',
    modelCode: '53А-2800010-К',
    compatiblePlatforms: ['gaz53'],
    lengthPx: 58,
    wheelBasePx: 37,
    frameLengthMm: 5450,
    wheelbaseMm: '3300 мм',
    massKg: 1090,
    payloadCapacityKg: 4000,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (240R508 / 8.25-20, задние двускатные)',
    mountTypes: ['short_tipper', 'municipal_pto', 'fifth_wheel'],
    crossmemberCount: 5,
    frameColor: '#1e222b',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -10,
    notes: 'Укороченная задняя консоль с усиленной поперечиной под цапфы гидроцилиндра самосвала или лёгкое ССУ.',
  },
  {
    id: 'frm_gaz53_long_4500',
    nameRu: 'Длиннобазная рама ГАЗ-53Д (4500 мм)',
    modelCode: '53Д-2800010-ДЛ',
    compatiblePlatforms: ['gaz53'],
    lengthPx: 76,
    wheelBasePx: 50,
    frameLengthMm: 7250,
    wheelbaseMm: '4500 мм',
    massKg: 1360,
    payloadCapacityKg: 4500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (240R508, задние двускатные)',
    mountTypes: ['long_subframe', 'medium_subframe'],
    crossmemberCount: 7,
    frameColor: '#151921',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -14,
    notes: 'Удлинённые лонжероны со вставками, двухзвенный карданный вал с промежуточной опорой под длинные фургоны и эвакуаторы.',
  },
  {
    id: 'frm_gaz_awd_4x4',
    nameRu: 'Полноприводная рама ГАЗ-3308 «Садко» (3770 мм, 4x4)',
    modelCode: '3308-2800010-4WD',
    compatiblePlatforms: ['gaz53'],
    lengthPx: 64,
    wheelBasePx: 41,
    frameLengthMm: 6250,
    wheelbaseMm: '3770 мм',
    massKg: 1540,
    payloadCapacityKg: 4200,
    wheelFormula: '4x4',
    axleCount: 2,
    rearTireType: 'offroad_single',
    totalWheels: 4,
    tireSpecRu: '4 колеса (12.00R18 КИ-113, односкатные вездеходные с подкачкой)',
    mountTypes: ['short_tipper', 'medium_subframe', 'municipal_pto', 'fire_special'],
    crossmemberCount: 6,
    frameColor: '#1c241e',
    hasFrontDriveAxle: true,
    fuelTankCount: 2,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -11,
    notes: 'Ведущий передний мост с кулачковым дифференциалом, раздаточная коробка и односкатные широкопрофильные шины с грунтозацепом.',
  },

  // --- РАМЫ ЗИЛ-130 И ЗИЛ-4331 ---
  {
    id: 'frm_zil130_std_3800',
    nameRu: 'Стандартная рама ЗИЛ-130-76 (3800 мм)',
    modelCode: '130-2800010-76',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 70,
    wheelBasePx: 45,
    frameLengthMm: 6675,
    wheelbaseMm: '3800 мм',
    massKg: 1620,
    payloadCapacityKg: 6000,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (260R508 / 9.00R20, задние двускатные)',
    mountTypes: ['medium_subframe', 'municipal_pto', 'fire_special'],
    crossmemberCount: 6,
    frameColor: '#141820',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -13,
    notes: 'Классическая клепаная рама ЗИЛ-130 из легированной стали, бак 170 л, два ресивера тормозов и буксирный прибор с пневмовыводами.',
  },
  {
    id: 'frm_zil130_dump_3300',
    nameRu: 'Короткобазная самосвальная рама ЗИЛ-130Д1 (3300 мм)',
    modelCode: '130Д1-2800010',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 60,
    wheelBasePx: 38,
    frameLengthMm: 5475,
    wheelbaseMm: '3300 мм',
    massKg: 1490,
    payloadCapacityKg: 5500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (260R508 / 9.00R20, задние двускатные)',
    mountTypes: ['short_tipper', 'municipal_pto'],
    crossmemberCount: 5,
    frameColor: '#191d26',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -11,
    notes: 'Укороченная на 1192 мм рама под самосвалы ММЗ-555 и ММЗ-4502. Оснащена КОМ, масляным баком и траверсой телескопического гидроцилиндра.',
  },
  {
    id: 'frm_zil130_tractor_3300',
    nameRu: 'Седельная рама тягача ЗИЛ-130В1 / 441510 (3300 мм)',
    modelCode: '130В1-2800010',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 58,
    wheelBasePx: 37,
    frameLengthMm: 5290,
    wheelbaseMm: '3300 мм',
    massKg: 1460,
    payloadCapacityKg: 6500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (260R508 / 9.00R20, задние двускатные)',
    mountTypes: ['fifth_wheel', 'short_tipper'],
    crossmemberCount: 5,
    frameColor: '#11151c',
    hasFrontDriveAxle: false,
    fuelTankCount: 2,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -11,
    notes: 'Седельное шасси с двумя баками по 125 л, двухпроводным пневмоприводом тормозов полуприцепа и скошенными задними концами лонжеронов.',
  },
  {
    id: 'frm_zil130_long_4500',
    nameRu: 'Длиннобазная рама ЗИЛ-130Г / 4331Г (4500 мм)',
    modelCode: '130Г-2800010',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 80,
    wheelBasePx: 52,
    frameLengthMm: 7610,
    wheelbaseMm: '4500 мм',
    massKg: 1820,
    payloadCapacityKg: 6500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (260R508 / 9.00R20, задние двускатные)',
    mountTypes: ['long_subframe', 'medium_subframe', 'fire_special'],
    crossmemberCount: 7,
    frameColor: '#151921',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -15,
    notes: 'Длиннобазное шасси с 7 поперечинами и промежуточной опорой кардана для длинномерных кузовов, автолестниц и эвакуаторов.',
  },
  {
    id: 'frm_zil4331_std_3800',
    nameRu: 'Усиленная дизельная рама ЗИЛ-433102 (3800 мм)',
    modelCode: '4331-2800010',
    compatiblePlatforms: ['zil4331', 'zil130'],
    lengthPx: 72,
    wheelBasePx: 46,
    frameLengthMm: 6760,
    wheelbaseMm: '3800 мм',
    massKg: 1790,
    payloadCapacityKg: 7000,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (260R508, бездисковые ступицы, задние двускатные)',
    mountTypes: ['medium_subframe', 'municipal_pto', 'fire_special'],
    crossmemberCount: 6,
    frameColor: '#111622',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'frame_side',
    fifthWheelOffsetPx: -13,
    notes: 'Лонжероны увеличенной высоты полки (268 мм), гипоидный задний мост, пружинные энергоаккумуляторы и КОМ под коммунальные/пожарные насосы.',
  },
  {
    id: 'frm_zil4327_awd_4x4',
    nameRu: 'Внедорожная полноприводная рама ЗИЛ-4327 / 4334 (4x4)',
    modelCode: '4327-2800010-4x4',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 68,
    wheelBasePx: 44,
    frameLengthMm: 6550,
    wheelbaseMm: '3800 мм',
    massKg: 2140,
    payloadCapacityKg: 5500,
    wheelFormula: '4x4',
    axleCount: 2,
    rearTireType: 'offroad_single',
    totalWheels: 4,
    tireSpecRu: '4 колеса (370/80R20 ОИ-25, односкатные вездеходные)',
    mountTypes: ['medium_subframe', 'municipal_pto', 'fire_special', 'short_tipper'],
    crossmemberCount: 6,
    frameColor: '#1b221c',
    hasFrontDriveAxle: true,
    fuelTankCount: 2,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -12,
    notes: 'Высокий клиренс, двуступенчатая раздаточная коробка с блокировкой межосевого дифференциала, ведущий передний мост.',
  },
  {
    id: 'frm_zil133_tandem_6x4',
    nameRu: 'Трёхосная рама ЗИЛ-133ГЯ / 6309 «Баба-Яга» (6x4, 10 колёс)',
    modelCode: '133ГЯ-2800010',
    compatiblePlatforms: ['zil130', 'zil4331'],
    lengthPx: 86,
    wheelBasePx: 56,
    frameLengthMm: 9000,
    wheelbaseMm: '4610+1400 мм',
    massKg: 2620,
    payloadCapacityKg: 10500,
    wheelFormula: '6x4',
    axleCount: 3,
    rearTireType: 'dual',
    totalWheels: 10,
    tireSpecRu: '10 колёс (260R508, двухосная балансирная тележка, двускатные)',
    mountTypes: ['heavy_tandem', 'long_subframe', 'medium_subframe', 'fire_special', 'municipal_pto'],
    crossmemberCount: 8,
    frameColor: '#131720',
    hasFrontDriveAxle: false,
    fuelTankCount: 2,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -16,
    notes: 'Трёхосное шасси повышенной грузоподъёмности (10 т) с проходным средним мостом, межосевым дифференциалом и балансирной подвеской.',
  },

  // --- РАМЫ КАМАЗ ---
  {
    id: 'frm_kamaz_5410_semi',
    nameRu: 'Седельная рама тягача КАМАЗ-5410 (6x4, 2840+1320 мм)',
    modelCode: '5410-2800010',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 66,
    wheelBasePx: 43,
    frameLengthMm: 6180,
    wheelbaseMm: '2840+1320 мм',
    massKg: 2420,
    payloadCapacityKg: 11500,
    wheelFormula: '6x4',
    axleCount: 3,
    rearTireType: 'dual',
    totalWheels: 10,
    tireSpecRu: '10 колёс (260R508 / 9.00R20, тележка 6x4, двускатные)',
    mountTypes: ['fifth_wheel', 'short_tipper'],
    crossmemberCount: 6,
    frameColor: '#141821',
    hasFrontDriveAxle: false,
    fuelTankCount: 2,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -12,
    notes: 'Короткая трёхосная рама магистрального тягача с балансирной тележкой, двумя баками по 175 л и выводами пневмо/электромагистралей.',
  },
  {
    id: 'frm_kamaz_5511_dump',
    nameRu: 'Усиленная самосвальная рама КАМАЗ-55111 (6x4, 13 т)',
    modelCode: '55111-2800010',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 70,
    wheelBasePx: 45,
    frameLengthMm: 6580,
    wheelbaseMm: '2840+1320 мм',
    massKg: 2680,
    payloadCapacityKg: 13000,
    wheelFormula: '6x4',
    axleCount: 3,
    rearTireType: 'dual',
    totalWheels: 10,
    tireSpecRu: '10 колёс (260R508 / 9.00R20, усиленная тележка 6x4)',
    mountTypes: ['heavy_tandem', 'short_tipper', 'municipal_pto'],
    crossmemberCount: 6,
    frameColor: '#1c1917',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -13,
    notes: 'Усиленные лонжероны с внутренними вкладышами («лонжерон в лонжероне»), надрамник с опорой гидроцилиндра и задними шарнирами кузова.',
  },
  {
    id: 'frm_kamaz_5320_std',
    nameRu: 'Стандартная бортовая рама КАМАЗ-5320 (6x4, 3190+1320 мм)',
    modelCode: '5320-2800010',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 74,
    wheelBasePx: 47,
    frameLengthMm: 7395,
    wheelbaseMm: '3190+1320 мм',
    massKg: 2560,
    payloadCapacityKg: 10000,
    wheelFormula: '6x4',
    axleCount: 3,
    rearTireType: 'dual',
    totalWheels: 10,
    tireSpecRu: '10 колёс (260R508 / 9.00R20, тележка 6x4, двускатные)',
    mountTypes: ['medium_subframe', 'heavy_tandem', 'municipal_pto', 'fire_special'],
    crossmemberCount: 7,
    frameColor: '#151921',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -14,
    notes: 'Универсальная трёхосная рама КАМАЗ-5320 с еврофаркопом («зев»), пневмовыводами прицепа и креплениями под фургоны, цистерны и бортовые кузова.',
  },
  {
    id: 'frm_kamaz_53212_long',
    nameRu: 'Длиннобазная тяжёлая рама КАМАЗ-53212 / 53215 (6x4, 3690+1320 мм)',
    modelCode: '53212-2800010',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 82,
    wheelBasePx: 53,
    frameLengthMm: 8195,
    wheelbaseMm: '3690+1320 мм',
    massKg: 2810,
    payloadCapacityKg: 11500,
    wheelFormula: '6x4',
    axleCount: 3,
    rearTireType: 'dual',
    totalWheels: 10,
    tireSpecRu: '10 колёс (280R508 / 10.00R20, тележка 6x4, двускатные)',
    mountTypes: ['long_subframe', 'heavy_tandem', 'medium_subframe', 'fire_special'],
    crossmemberCount: 8,
    frameColor: '#11151d',
    hasFrontDriveAxle: false,
    fuelTankCount: 2,
    spareWheelMount: 'under_rear',
    fifthWheelOffsetPx: -16,
    notes: 'Удлинённая рама для крупнотоннажных фургонов, 30-метровых пожарных автолестниц, длинных бортовых платформ и тяжёлых эвакуаторов.',
  },
  {
    id: 'frm_kamaz_43253_4x2',
    nameRu: 'Двухосная городская рама КАМАЗ-43253 (4x2, 6 колёс)',
    modelCode: '43253-2800010',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 68,
    wheelBasePx: 43,
    frameLengthMm: 6520,
    wheelbaseMm: '3690 мм',
    massKg: 1940,
    payloadCapacityKg: 7500,
    wheelFormula: '4x2',
    axleCount: 2,
    rearTireType: 'dual',
    totalWheels: 6,
    tireSpecRu: '6 колёс (280R508 / 10.00R20, один ведущий мост, двускатные)',
    mountTypes: ['medium_subframe', 'municipal_pto', 'short_tipper', 'fire_special'],
    crossmemberCount: 6,
    frameColor: '#181e29',
    hasFrontDriveAxle: false,
    fuelTankCount: 1,
    spareWheelMount: 'frame_side',
    fifthWheelOffsetPx: -12,
    notes: 'Маневренное двухосное шасси с уменьшенной снаряжённой массой и одним ведущим задним мостом под коммунальные и городские кузова.',
  },
  {
    id: 'frm_kamaz_4310_6x6',
    nameRu: 'Внедорожная полноприводная рама КАМАЗ-4310 / 43118 (6x6)',
    modelCode: '4310-2800010-6x6',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 76,
    wheelBasePx: 49,
    frameLengthMm: 7650,
    wheelbaseMm: '3340+1320 мм',
    massKg: 3120,
    payloadCapacityKg: 10000,
    wheelFormula: '6x6',
    axleCount: 3,
    rearTireType: 'offroad_single',
    totalWheels: 6,
    tireSpecRu: '6 колёс (1220x400-533 ИП-184, односкатные вездеходные с подкачкой)',
    mountTypes: ['medium_subframe', 'heavy_tandem', 'fire_special', 'fifth_wheel', 'municipal_pto'],
    crossmemberCount: 7,
    frameColor: '#1b241d',
    hasFrontDriveAxle: true,
    fuelTankCount: 2,
    spareWheelMount: 'behind_cab',
    fifthWheelOffsetPx: -14,
    notes: 'Полноприводное шасси 6x6 с тремя ведущими мостами, раздаточной коробкой, лебёдкой и односкатными широкопрофильными шинами.',
  },
  {
    id: 'frm_kamaz_65201_8x4',
    nameRu: 'Сверхтяжёлая четырёхосная рама КАМАЗ-65201 (8x4, 12 колёс)',
    modelCode: '65201-2800010-8x4',
    compatiblePlatforms: ['kamaz'],
    lengthPx: 88,
    wheelBasePx: 58,
    frameLengthMm: 9100,
    wheelbaseMm: '1800+3060+1440 мм',
    massKg: 3850,
    payloadCapacityKg: 20000,
    wheelFormula: '8x4',
    axleCount: 4,
    rearTireType: 'dual',
    totalWheels: 12,
    tireSpecRu: '12 колёс (315/80R22.5, 2 передние управляемые оси + двускатная тележка)',
    mountTypes: ['heavy_tandem', 'long_subframe', 'fire_special'],
    crossmemberCount: 9,
    frameColor: '#12151c',
    hasFrontDriveAxle: false,
    fuelTankCount: 2,
    spareWheelMount: 'frame_side',
    fifthWheelOffsetPx: -16,
    notes: 'Четырёхосное шасси особо высокой грузоподъёмности (20 т) со сдвоенными передними управляемыми осями и усиленной балансирной тележкой.',
  },
];

// ============================================================================
// КАТАЛОГ КУЗОВОВ И НАДСТРОЕК (МОДИФИКАТОРЫ РАМЫ)
// ============================================================================

export const TRUCK_BODY_VARIANTS: TruckBodyVariant[] = [
  {
    id: 'body_none',
    nameRu: 'Голая рама (Без кузова)',
    modelCode: 'ШАССИ-00',
    massKg: 0,
    requiredMounts: [],
    minPayloadKg: 0,
    attachmentCarType: null,
    notes: 'Открытая лонжеронная рама с полностью видимой трансмиссией, карданными валами, редукторами мостов, рессорами, ресиверами и баками.',
  },
  {
    id: 'body_fifth_wheel',
    nameRu: 'Седельно-сцепное устройство ССУ (Седельный тягач)',
    modelCode: 'ССУ-5410 / 130В1',
    massKg: 380,
    requiredMounts: ['fifth_wheel'],
    minPayloadKg: 3500,
    attachmentCarType: 'truck_semi',
    notes: 'Литое чугунное седло со шкворневым замком 50 мм, рифлёный переходной мостик и стойка с витыми пневмо- и электромагистралями для полуприцепов.',
  },
  {
    id: 'body_flatbed_wood',
    nameRu: 'Деревянный бортовой кузов с откидными бортами',
    modelCode: 'ПЛ-5312 / 130',
    massKg: 650,
    requiredMounts: ['medium_subframe', 'long_subframe'],
    minPayloadKg: 2500,
    attachmentCarType: 'truck_flatbed',
    notes: 'Классическая деревянная бортовая платформа на поперечных брусьях с тремя откидными бортами, оковками и крюками тента.',
  },
  {
    id: 'body_covered_slate',
    nameRu: 'Деревянный кунг с шиферной крышей и буржуйкой',
    modelCode: 'КУНГ-53Ш',
    massKg: 940,
    requiredMounts: ['medium_subframe', 'long_subframe'],
    minPayloadKg: 2500,
    attachmentCarType: 'truck_covered',
    notes: 'Деревянная будка-бытовка, крытая волнистым асбестоцементным шифером с вытяжной трубой печи-буржуйки и распашными дверями.',
  },
  {
    id: 'body_box_insulated',
    nameRu: 'Изотермический промтоварный фургон (Будка)',
    modelCode: 'КМЗ-4738 / ГЗСА',
    massKg: 1180,
    requiredMounts: ['medium_subframe', 'long_subframe'],
    minPayloadKg: 3500,
    attachmentCarType: 'truck_box',
    notes: 'Цельнометаллический каркасный фургон с наружной обшивкой из дюралюминиевых листов и усиленными штанговыми запорами ворот.',
  },
  {
    id: 'body_dump_zil_mmz',
    nameRu: 'Самосвальный кузов ММЗ-555 «Лодочка» (Корыто)',
    modelCode: 'ММЗ-555-8500010',
    massKg: 890,
    requiredMounts: ['short_tipper'],
    minPayloadKg: 3500,
    attachmentCarType: 'truck_zil_dump',
    notes: 'Знаменитый полукруглый строительный кузов-корыто с защитным козырьком над кабиной, телескопическим гидроцилиндром и автозамками заднего борта.',
  },
  {
    id: 'body_dump_kamaz_5511',
    nameRu: 'Тяжёлый карьерный кузов-самосвал КАМАЗ-5511 (Ковш)',
    modelCode: '5511-8500010',
    massKg: 1680,
    requiredMounts: ['heavy_tandem', 'short_tipper'],
    minPayloadKg: 5000,
    attachmentCarType: 'truck_dump',
    notes: 'Цельнометаллический сварной кузов ковшового типа с наклонными бортами, мощными рёбрами жёсткости, обогревом днища и козырьком.',
  },
  {
    id: 'body_tanker_fuel',
    nameRu: 'Топливная цистерна ГСМ АЦ-8.5 «ОГНЕОПАСНО» (Бензовоз)',
    modelCode: 'АЦ-4331 / ГРАЗ',
    massKg: 1380,
    requiredMounts: ['medium_subframe', 'heavy_tandem', 'municipal_pto'],
    minPayloadKg: 4000,
    attachmentCarType: 'truck_tanker',
    fluidTankSpec: {
      liquidType: 'fuel_ai92',
      capacity: 8500,
      currentVolume: 6500,
      currentAmount: 6500,
      isHermetic: true,
    },
    notes: 'Калиброванная эллиптическая цистерна для перевозки светлых нефтепродуктов с верхним трапом, заливными люками и дыхательными клапанами.',
  },
  {
    id: 'body_tanker_water',
    nameRu: 'Поливомоечное оборудование КО-829А (Водовоз с соплами)',
    modelCode: 'КО-829А-01',
    massKg: 1320,
    requiredMounts: ['municipal_pto', 'medium_subframe', 'heavy_tandem'],
    minPayloadKg: 4000,
    attachmentCarType: 'truck_water',
    fluidTankSpec: {
      liquidType: 'water',
      capacity: 6000,
      currentVolume: 6000,
      currentAmount: 6000,
      isHermetic: false,
      hasWaterHose: true,
    },
    notes: 'Цистерна для воды с центробежным насосом от КОМ, передними напорными соплами («утиными лапками») и барабаном с поливочным рукавом.',
  },
  {
    id: 'body_cement_mixer',
    nameRu: 'Бетоносмесительная установка АБС-7ДА (Миксер 7 м³)',
    modelCode: 'АБС-7ДА / СБ-92',
    massKg: 2850,
    requiredMounts: ['heavy_tandem'],
    minPayloadKg: 8000,
    minAxleCount: 3,
    attachmentCarType: 'cement_mixer',
    notes: 'Грушевидный смесительный барабан со спиральными лопастями внутри, баком для воды, загрузочной воронкой и поворотным разгрузочным лотком.',
  },
  {
    id: 'body_garbage_compactor',
    nameRu: 'Кузовной мусоровоз с задним прессователем КО-440',
    modelCode: 'КО-440-5',
    massKg: 1980,
    requiredMounts: ['municipal_pto', 'heavy_tandem'],
    minPayloadKg: 4500,
    attachmentCarType: 'garbage_truck',
    notes: 'Спецкузов с выталкивающей плитой, гидравлическим прессующим механизмом, задним приёмным бункером и проблесковыми маячками.',
  },
  {
    id: 'body_tow_platform',
    nameRu: 'Эвакуаторная платформа с гидравлической лебёдкой и брилем',
    modelCode: 'ЭВ-4331 / Чайка-Сервис',
    massKg: 1450,
    requiredMounts: ['medium_subframe', 'long_subframe'],
    minPayloadKg: 4000,
    attachmentCarType: 'truck_tow',
    notes: 'Стальная платформа с рифлёным настилом, тяговой лебёдкой, выдвижной стрелой-брилем частичной погрузки и инструментальными ящиками.',
  },
  {
    id: 'body_armored_vault',
    nameRu: 'Бронированный инкассаторский спецкузов «Панцирь» (3 класс)',
    modelCode: 'СБА-4331-ИНК',
    massKg: 2450,
    requiredMounts: ['short_tipper', 'medium_subframe'],
    minPayloadKg: 4000,
    attachmentCarType: 'truck_armored',
    notes: 'Цельносварной бронекапсульный кузов со скрытым бронированием, бойницами, сейфовым отсеком и цветографической схемой инкассации.',
  },
  {
    id: 'body_fire_pumper',
    nameRu: 'Пожарная автоцистерна АЦ-40 с лафетным стволом',
    modelCode: 'АЦ-40(130)-63Б',
    massKg: 2150,
    requiredMounts: ['fire_special'],
    minPayloadKg: 5000,
    attachmentCarType: 'fire_engine',
    fluidTankSpec: {
      liquidType: 'water',
      capacity: 4000,
      currentVolume: 4000,
      currentAmount: 4000,
      isHermetic: true,
      hasWaterHose: true,
    },
    notes: 'Пожарная надстройка с цистерной воды, пенобаком, насосным отсеком ПН-40УВ, шторными отсеками ПТВ, трёхколенной лестницей и лафетным стволом.',
  },
  {
    id: 'body_fire_ladder',
    nameRu: 'Пожарная автолестница АЛ-30 (30 м) с аутригерами',
    modelCode: 'АЛ-30(53212)-ПМ506',
    massKg: 3250,
    requiredMounts: ['fire_special'],
    minPayloadKg: 6500,
    attachmentCarType: 'fire_ladder',
    notes: 'Полноповоротная четырёхколенная телескопическая стрела 30 м с люлькой, гидравлической башней и 4 выдвижными опорами-аутригерами.',
  },
  {
    id: 'body_fire_rescue',
    nameRu: 'Аварийно-спасательный модуль АСА с пневмомачтой',
    modelCode: 'АСА-20-МЧС',
    massKg: 1850,
    requiredMounts: ['fire_special'],
    minPayloadKg: 4200,
    attachmentCarType: 'fire_rescue',
    notes: 'Кузов-фургон со шторными отсеками под гидравлический аварийно-спасательный инструмент, электрогенератором и телескопической световой мачтой.',
  },
  {
    id: 'body_crane_ks3577',
    nameRu: 'Стреловой автокран КС-3577 «Ивановец» (Телескоп 14–22 м, 16 т)',
    modelCode: 'КС-3577-4 / КС-45717',
    massKg: 3150,
    requiredMounts: ['municipal_pto', 'heavy_tandem', 'medium_subframe', 'long_subframe'],
    minPayloadKg: 4000,
    attachmentCarType: 'truck_crane',
    notes: 'Полноповоротная крановая установка (360°) с трёхсекционной телескопической стрелой 14–22 м, кабиной крановщика, противовесом, грузовой лебёдкой с гаком и 4 выдвижными гидроопорами-аутригерами.',
  },
  {
    id: 'body_vacuum_ko503',
    nameRu: 'Вакуумная ассенизаторская машина КО-503В / АНМ-53 (Цистерна 4.2 м³)',
    modelCode: 'КО-503В-2 / АНМ-53',
    massKg: 1280,
    requiredMounts: ['municipal_pto', 'medium_subframe', 'short_tipper'],
    minPayloadKg: 3500,
    attachmentCarType: 'truck_vacuum_ko503',
    fluidTankSpec: {
      liquidType: 'sewage',
      capacity: 4200,
      currentVolume: 0,
      currentAmount: 0,
      isHermetic: true,
      hasWaterHose: true,
      isVacuumTank: true,
      vacuumPumpMode: 'suction',
      vacuumPressureBar: 0,
      spuCutoffActive: false,
    },
    notes: 'Наклонная цилиндрическая вакуумная цистерна Горводоканала (4200 л) с пластинчато-роторным насосом КО-503, СПУ с поплавковым клапаном, гофрированным заборным рукавом d=100 мм и шиберной задвижкой АНМ-53.',
  },
  {
    id: 'body_vacuum_sludge_ko505',
    nameRu: 'Тяжёлая илососная машина КО-505А со стрелой (Цистерна 10 м³)',
    modelCode: 'КО-505А / КО-507А',
    massKg: 2650,
    requiredMounts: ['municipal_pto', 'heavy_tandem', 'long_subframe', 'medium_subframe'],
    minPayloadKg: 5500,
    attachmentCarType: 'truck_vacuum_ko505',
    fluidTankSpec: {
      liquidType: 'sewage',
      capacity: 10000,
      currentVolume: 0,
      currentAmount: 0,
      isHermetic: true,
      hasWaterHose: true,
      isVacuumTank: true,
      vacuumPumpMode: 'suction',
      vacuumPressureBar: 0,
      spuCutoffActive: false,
      rearDoorOpen: false,
      sludgeBoomAngle: 0,
      sludgeBoomExtension: 0.35,
    },
    notes: 'Толстостенная вакуумно-илососная цистерна (10 000 л) с 4 внешними шпангоутами жёсткости, насосом ВК-6М2, верхней поворотной гидравлической всасывающей стрелой d=100 мм и откидным задним днищем на гидроцилиндрах.',
  },
  {
    id: 'body_vacuum_kombi_ko560',
    nameRu: 'Комбинированная каналопромывочная вакуум-машина КО-560 (6.5 м³)',
    modelCode: 'КО-560 / ДКТ-245',
    massKg: 2180,
    requiredMounts: ['municipal_pto', 'medium_subframe', 'heavy_tandem', 'long_subframe'],
    minPayloadKg: 4200,
    attachmentCarType: 'truck_vacuum_ko560',
    fluidTankSpec: {
      liquidType: 'sewage',
      capacity: 6500,
      currentVolume: 0,
      currentAmount: 0,
      isHermetic: true,
      hasWaterHose: true,
      isVacuumTank: true,
      vacuumPumpMode: 'suction',
      vacuumPressureBar: 0,
      spuCutoffActive: false,
      cleanWaterCapacity: 2500,
      cleanWaterVolume: 2500,
      isJetterPumpActive: false,
      activeHoseMode: 'vacuum',
    },
    notes: 'Двухотсечная аварийная машина Водоканала: боковые баки чистой воды из нержавеющей стали с плунжерным насосом ВД, центральная иловая вакуум-бочка (6500 л), задний барабан РВД и заборный гофрорукав.',
  },
];

// ============================================================================
// ХЕЛПЕРЫ СОВМЕСТИМОСТИ И РАЗРЕШЕНИЯ РАМ И КУЗОВОВ
// ============================================================================

/**
 * Определяет платформу грузовика по его CarType.
 */
export function getTruckPlatform(carType: string): TruckPlatformId | null {
  switch (carType) {
    case 'truck_flatbed':
    case 'truck_covered':
      return 'gaz53';
    case 'truck_zil_dump':
    case 'fire_engine':
      return 'zil130';
    case 'truck_water':
    case 'truck_tanker':
    case 'truck_tow':
    case 'truck_armored':
    case 'fire_rescue':
      return 'zil4331';
    case 'truck_semi':
    case 'truck_dump':
    case 'truck_box':
    case 'cement_mixer':
    case 'garbage_truck':
    case 'fire_ladder':
      return 'kamaz';
    default:
      return null;
  }
}

export function isConfigurableTruck(carType: string): boolean {
  return getTruckPlatform(carType) !== null;
}

/**
 * Возвращает список рам, доступных для указанного грузовика.
 */
export function getCompatibleFramesForTruck(carType: string): TruckFrameVariant[] {
  const platform = getTruckPlatform(carType);
  if (!platform) return [];
  return TRUCK_FRAME_VARIANTS.filter((f) => f.compatiblePlatforms.includes(platform));
}

/**
 * Проверяет, подходит ли кузов к выбранной раме по креплениям, грузоподъёмности и числу осей.
 */
export function isBodyCompatibleWithFrame(
  body: TruckBodyVariant,
  frame: TruckFrameVariant,
  carType?: string
): boolean {
  if (body.id === 'body_none') return true;
  if (body.minPayloadKg > frame.payloadCapacityKg) return false;
  if (body.minAxleCount && frame.axleCount < body.minAxleCount) return false;
  if (carType && body.compatiblePlatforms) {
    const platform = getTruckPlatform(carType);
    if (platform && !body.compatiblePlatforms.includes(platform)) return false;
  }
  if (body.requiredMounts.length > 0) {
    const hasMatchingMount = body.requiredMounts.some((m) => frame.mountTypes.includes(m));
    if (!hasMatchingMount) return false;
  }
  return true;
}

/**
 * Возвращает список кузовов/надстроек, которые можно установить на выбранную раму.
 */
export function getCompatibleBodiesForFrame(
  frame: TruckFrameVariant,
  carType?: string
): TruckBodyVariant[] {
  return TRUCK_BODY_VARIANTS.filter((b) => isBodyCompatibleWithFrame(b, frame, carType));
}

/**
 * Возвращает заводскую раму и кузов по умолчанию для каждого CarType.
 * Для 4 базовых грузовиков каталога (ГАЗ-53, ЗИЛ-130, ЗИЛ-4331, КАМАЗ) по умолчанию ставится ГОЛАЯ РАМА ('body_none').
 * Для скрытых legacy-типов (если они заспавнены на карте или в трафике) подставляется соответствующий кузов.
 */
export function getDefaultFrameAndBodyForCarType(
  carType: string
): { frameId: string; bodyId: string } | null {
  switch (carType) {
    // 4 базовых грузовых шасси в каталоге — по умолчанию с голой рамой!
    case 'truck_flatbed':
      return { frameId: 'frm_gaz53_std_3700', bodyId: 'body_none' };
    case 'truck_zil_dump':
      return { frameId: 'frm_zil130_std_3800', bodyId: 'body_none' };
    case 'truck_water':
      return { frameId: 'frm_zil4331_std_3800', bodyId: 'body_none' };
    case 'truck_semi':
      return { frameId: 'frm_kamaz_5320_std', bodyId: 'body_none' };

    // Скрытые legacy-типы для обратной совместимости со старыми сохранениями/трафиком:
    case 'truck_covered':
      return { frameId: 'frm_gaz53_std_3700', bodyId: 'body_covered_slate' };
    case 'truck_dump':
      return { frameId: 'frm_kamaz_5511_dump', bodyId: 'body_dump_kamaz_5511' };
    case 'truck_box':
      return { frameId: 'frm_kamaz_5320_std', bodyId: 'body_box_insulated' };
    case 'truck_tanker':
      return { frameId: 'frm_zil4331_std_3800', bodyId: 'body_tanker_fuel' };
    case 'cement_mixer':
      return { frameId: 'frm_kamaz_5511_dump', bodyId: 'body_cement_mixer' };
    case 'garbage_truck':
      return { frameId: 'frm_kamaz_5320_std', bodyId: 'body_garbage_compactor' };
    case 'truck_tow':
      return { frameId: 'frm_zil4331_std_3800', bodyId: 'body_tow_platform' };
    case 'truck_armored':
      return { frameId: 'frm_zil4331_std_3800', bodyId: 'body_armored_vault' };
    case 'fire_engine':
      return { frameId: 'frm_zil130_std_3800', bodyId: 'body_fire_pumper' };
    case 'fire_ladder':
      return { frameId: 'frm_kamaz_53212_long', bodyId: 'body_fire_ladder' };
    case 'fire_rescue':
      return { frameId: 'frm_zil4331_std_3800', bodyId: 'body_fire_rescue' };
    default:
      return null;
  }
}

export const isConfigurableTruckType = isConfigurableTruck;

export function getDefaultFrameForTruck(carType: string): TruckFrameVariant | null {
  const def = getDefaultFrameAndBodyForCarType(carType);
  if (def) {
    const f = getTruckFrameById(def.frameId);
    if (f) return f;
  }
  const compat = getCompatibleFramesForTruck(carType);
  return compat[0] || null;
}

export function getTruckFrameById(frameId?: string): TruckFrameVariant | undefined {
  if (!frameId) return undefined;
  return TRUCK_FRAME_VARIANTS.find((f) => f.id === frameId);
}

export function getTruckBodyById(bodyId?: string): TruckBodyVariant | undefined {
  if (!bodyId) return undefined;
  return TRUCK_BODY_VARIANTS.find((b) => b.id === bodyId);
}

/**
 * Разрешает текущую платформу, раму и кузов грузовика с проверкой совместимости.
 */
export function resolveVehicleTruckFrameAndBody(car: {
  type: string;
  frameId?: string;
  bodyId?: string;
  engineState?: { frameId?: string; bodyId?: string };
}): {
  platform: TruckPlatformId;
  frame: TruckFrameVariant;
  body: TruckBodyVariant;
} | null {
  const platform = getTruckPlatform(car.type);
  if (!platform) return null;

  const defaults = getDefaultFrameAndBodyForCarType(car.type);
  const compatFrames = getCompatibleFramesForTruck(car.type);
  const rawFrameId = car.frameId || car.engineState?.frameId || defaults?.frameId;
  const frame =
    compatFrames.find((f) => f.id === rawFrameId) ||
    getTruckFrameById(defaults?.frameId) ||
    compatFrames[0];

  if (!frame) return null;

  const rawBodyId = car.bodyId || car.engineState?.bodyId || defaults?.bodyId || 'body_none';
  const candidateBody = getTruckBodyById(rawBodyId);
  const body =
    candidateBody && isBodyCompatibleWithFrame(candidateBody, frame, car.type)
      ? candidateBody
      : TRUCK_BODY_VARIANTS[0]; // 'body_none'

  return { platform, frame, body };
}

/**
 * Computes the longitudinal X positions (in vehicle local coords) of all axles
 * for a configurable truck frame based on its real engineering specifications (wheelBasePx, front overhang, axle count).
 * Used by physics axle geometry, bare-frame rendering, and wheel rendering.
 */
export function getTruckFrameAxlePositions(
  frame: TruckFrameVariant,
  halfL: number,
  platform: TruckPlatformId
): { frontAxlesX: number[]; rearAxlesX: number[] } {
  const safeHalfL = isFinite(halfL) && halfL > 10 ? halfL : 35;
  const safePlatform = platform || 'kamaz';
  // Conventional hooded trucks (GAZ-53, ZIL-130, ZIL-4331) have the front axle positioned under the hood fenders,
  // whereas cab-over trucks (KAMAZ) have the front axle directly under the driver's seat.
  const frontOverhang =
    safePlatform === 'kamaz' ? 9.2 :
    safePlatform === 'gaz53' ? 12.5 : 13.5;
  const frontSteer1X = safeHalfL - frontOverhang;
  const frontAxlesX: number[] = [frontSteer1X];

  const axleCount = frame?.axleCount ?? 2;
  const rearTireType = frame?.rearTireType ?? 'dual';
  const wheelBase = frame?.wheelBasePx || (safeHalfL * (axleCount >= 3 ? 1.35 : 1.25));

  if (axleCount === 4) {
    // 8x4 heavy chassis (КАМАЗ-65201): 2nd steered front axle mounted 1.8m behind 1st steered axle, right behind cab
    frontAxlesX.push(frontSteer1X - 11.2);
  }

  const bogieSpacing = rearTireType === 'offroad_single' ? 11.2 : 10.4;
  let rearAxlesX: number[];

  if (axleCount === 2) {
    // 2-axle (4x2 / 4x4): rear single drive axle positioned exactly at wheelbase distance
    const rearX = frontSteer1X - wheelBase;
    rearAxlesX = [rearX];
  } else {
    // 3-axle (6x4 / 6x6) or 4-axle (8x4): tandem rear balancing bogie centered at wheelbase distance
    const bogieCenterX = frontSteer1X - wheelBase;
    const midAxleX = bogieCenterX + bogieSpacing * 0.5;
    const rearMostX = bogieCenterX - bogieSpacing * 0.5;
    rearAxlesX = [midAxleX, rearMostX];
  }

  return { frontAxlesX, rearAxlesX };
}

/**
 * Checks whether a vehicle has the truck boom crane superstructure (КС-3577 «Ивановец»).
 */
export function isVehicleCraneTruck(car?: {
  type?: string;
  frameId?: string;
  bodyId?: string;
  engineState?: { frameId?: string; bodyId?: string };
} | null): boolean {
  if (!car || !car.type) return false;
  if (car.bodyId === 'body_crane_ks3577' || car.engineState?.bodyId === 'body_crane_ks3577') return true;
  const resolved = resolveVehicleTruckFrameAndBody(car as { type: string; frameId?: string; bodyId?: string; engineState?: { frameId?: string; bodyId?: string } });
  return resolved?.body.id === 'body_crane_ks3577';
}

/**
 * Returns the specific vacuum superstructure body ID or 'trailer_vacuum' if the vehicle is a vacuum machine.
 */
export function getVehicleVacuumBodyId(car?: {
  type?: string;
  frameId?: string;
  bodyId?: string;
  engineState?: { frameId?: string; bodyId?: string };
} | null): 'body_vacuum_ko503' | 'body_vacuum_sludge_ko505' | 'body_vacuum_kombi_ko560' | 'trailer_vacuum' | null {
  if (!car || !car.type) return null;
  if (car.type === 'trailer_vacuum') return 'trailer_vacuum';
  const bId = car.bodyId || car.engineState?.bodyId;
  if (bId === 'body_vacuum_ko503' || bId === 'body_vacuum_sludge_ko505' || bId === 'body_vacuum_kombi_ko560') {
    return bId;
  }
  const resolved = resolveVehicleTruckFrameAndBody(car as { type: string; frameId?: string; bodyId?: string; engineState?: { frameId?: string; bodyId?: string } });
  const rb = resolved?.body.id;
  if (rb === 'body_vacuum_ko503' || rb === 'body_vacuum_sludge_ko505' || rb === 'body_vacuum_kombi_ko560') {
    return rb;
  }
  return null;
}

/**
 * Checks whether a vehicle has one of the vacuum sewage/sludge superstructures (КО-503В, КО-505А, КО-560) or is a vacuum trailer.
 */
export function isVehicleVacuumTruck(car?: {
  type?: string;
  frameId?: string;
  bodyId?: string;
  engineState?: { frameId?: string; bodyId?: string };
} | null): boolean {
  return getVehicleVacuumBodyId(car) !== null;
}

/**
 * Computes exact local and world geometry of the КС-3577 revolving crane turntable, telescopic boom sections, and hook block.
 */
export function getVehicleCraneGeometry(car: {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  craneTurretAngle?: number;
  craneBoomExtension?: number;
  craneBoomElevation?: number;
  craneHookHeight?: number;
  craneOutriggersDeployed?: boolean;
  craneOutriggerExt?: number;
}): {
  turretLocalX: number;
  baseBoomLengthPx: number;
  totalBoomReachPx: number;
  turretAngleRad: number;
  turretAngle: number;
  hookHeight: number;
  outriggerExt: number;
  worldTurretX: number;
  worldTurretY: number;
  worldBoomAngle: number;
  worldBoomTipX: number;
  worldBoomTipY: number;
  boomLengthMeters: number;
  maxLoadTons: number;
} {
  const halfL = (car.length || 70) / 2;
  // Revolving turret pedestal center over rear bogie / axle
  const turretLocalX = -halfL + Math.max(12.5, (car.length || 70) * 0.25);
  const ext = Math.max(0, Math.min(1, car.craneBoomExtension ?? 0));
  const elev = Math.max(0, Math.min(1, car.craneBoomElevation ?? 0.2));
  const hookHeight = Math.max(0, Math.min(1, car.craneHookHeight ?? 0.25));
  const outriggerExt = Math.max(0, Math.min(1, car.craneOutriggerExt ?? (car.craneOutriggersDeployed ? 1 : 0)));
  const turretAngleRad = car.craneTurretAngle ?? 0;

  // Base root boom section length + 2 telescopic inner sections
  const baseBoomLengthPx = Math.max(25, halfL - turretLocalX - 3.5);
  const telescopicExtraPx = ext * 40.0; // Extends up to +40 px beyond stowed length
  // Slight foreshortening when elevated steeply in top-down 2.5D projection
  const elevationProjFactor = 1.0 - elev * 0.14;
  const totalBoomReachPx = (baseBoomLengthPx + telescopicExtraPx) * elevationProjFactor;

  const cosCar = Math.cos(car.angle || 0);
  const sinCar = Math.sin(car.angle || 0);
  const worldTurretX = (car.x || 0) + cosCar * turretLocalX;
  const worldTurretY = (car.y || 0) + sinCar * turretLocalX;

  const worldBoomAngle = (car.angle || 0) + turretAngleRad;
  // Boom root pivot is slightly behind turret center (-4.2 px in turret local frame), so tip is at totalBoomReachPx - 4.2 from turret center
  const tipOffsetFromTurret = Math.max(16, totalBoomReachPx - 4.2);
  const worldBoomTipX = worldTurretX + Math.cos(worldBoomAngle) * tipOffsetFromTurret;
  const worldBoomTipY = worldTurretY + Math.sin(worldBoomAngle) * tipOffsetFromTurret;

  const boomLengthMeters = +(9.0 + ext * 12.7).toFixed(1); // 9.0m to 21.7m (КС-3577-4 / КС-45717 spec)
  const outriggersBonus = car.craneOutriggersDeployed ? 1.0 : 0.45;
  const maxLoadTons = +((16.0 * (1.0 - ext * 0.62)) * outriggersBonus).toFixed(1);

  return {
    turretLocalX,
    baseBoomLengthPx,
    totalBoomReachPx,
    turretAngleRad,
    turretAngle: turretAngleRad,
    hookHeight,
    outriggerExt,
    worldTurretX,
    worldTurretY,
    worldBoomAngle,
    worldBoomTipX,
    worldBoomTipY,
    boomLengthMeters,
    maxLoadTons,
  };
}


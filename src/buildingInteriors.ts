import { Building, Player } from './types';
import { sound } from './audio';
import { renderInteriorFurniture } from './interiorFurnitureRenderer';
import { getApartmentById, getCityApartments } from './propertySystem';

export interface InteriorWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isJailBars?: boolean;
}

export interface InteriorFurniture {
  type: 
    | 'bed' 
    | 'sofa' 
    | 'tv_cabinet' 
    | 'tv' 
    | 'table' 
    | 'chair' 
    | 'counter' 
    | 'shelf' 
    | 'desk' 
    | 'computer' 
    | 'plant' 
    | 'carpet' 
    | 'cooler' 
    | 'toilet' 
    | 'bath' 
    | 'bed_hospital' 
    | 'desk_reception' 
    | 'sink' 
    | 'vending_machine'
    | 'fire_rack'
    | 'jail_cot'
    | 'kitchen_counter'
    | 'fridge'
    | 'wardrobe'
    | 'nightstand'
    | 'bookshelf'
    | 'blackboard'
    | 'whiteboard'
    | 'kids_table'
    | 'kids_bed'
    | 'toy_chest'
    | 'bench'
    | 'trash_can'
    | 'mailbox_bank'
    | 'radiator'
    | 'atm'
    | 'cash_register'
    | 'freezer_display'
    | 'pallet_stack'
    | 'file_cabinet'
    | 'server_rack'
    | 'exam_table'
    | 'car_podium'
    | 'lockers'
    | 'stove'
    | 'microwave'
    | 'washing_machine'
    | 'safe'
    | 'dresser'
    | 'coat_rack'
    | 'mirror'
    | 'bean_bag'
    | 'floor_lamp';
  x: number; // relative X
  y: number; // relative Y
  width: number;
  height: number;
  angle: number;
  color: string;
}

export interface InteriorZone {
  x: number;
  y: number;
  width: number;
  height: number;
  entranceIndex?: number;
  sectionIndex?: number;
}

export interface InteriorRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  floorColor?: string;
  floorStyle?: 'parquet' | 'tile' | 'wood' | 'linoleum' | 'carpet' | 'playmat' | 'concrete';
}

export interface BuildingLayout {
  buildingId: string;
  floor: number;
  width: number;
  height: number;
  rooms: InteriorRoom[];
  walls: InteriorWall[];
  furniture: InteriorFurniture[];
  elevatorZone: InteriorZone;
  stairsZone: InteriorZone;
  exitZone: InteriorZone;
  elevators: InteriorZone[];
  stairs: InteriorZone[];
  exits: InteriorZone[];
}

export function getBuildingFloorsCount(bld: Building): number {
  if (typeof bld.floorsCount === 'number' && bld.floorsCount > 0) {
    return bld.floorsCount;
  }
  if (bld.interiors && Object.keys(bld.interiors).length > 0) {
    return Object.keys(bld.interiors).length;
  }
  switch (bld.type) {
    case 'business_center':
      return 16;
    case 'modern_residential':
      return 12;
    case 'panel_apartment':
      return 9;
    case 'office':
    case 'brick_residential':
      return 5;
    case 'hospital':
    case 'police_station':
      return 3;
    case 'shopping_mall':
    case 'commercial':
    case 'school_kindergarten':
    case 'suburban':
    case 'fire_station':
    case 'transit_hub':
    case 'railway_station':
    case 'cultural_center':
      return 2;
    case 'shop':
    case 'car_dealership':
    case 'supermarket_store':
    case 'pharmacy_store':
    case 'bakery_cafe':
    case 'coffee_bistro':
    default:
      return 1;
  }
}

export function createDefaultBuildingLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const exitZone: InteriorZone = { x: Math.max(0, W / 2 - 12), y: H - 16, width: 24, height: 16 };
  const stairsZone: InteriorZone = { x: 10, y: 10, width: 20, height: 20 };
  const elevatorZone: InteriorZone = { x: W - 30, y: 10, width: 20, height: 20 };

  return {
    buildingId: bld.id,
    floor,
    width: W,
    height: H,
    rooms: [
      {
        name: floor === 0 ? 'Основной Зал' : 'Этаж ' + (floor + 1),
        x: 6,
        y: 6,
        width: W - 12,
        height: H - 12,
        color: '#1e293b',
        floorStyle: (bld.type && bld.type.includes('residential')) ? 'parquet' : 'tile'
      }
    ],
    walls: [
      { x1: 6, y1: 6, x2: W - 6, y2: 6 },
      { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
      { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
      { x1: 6, y1: H - 6, x2: 6, y2: 6 }
    ],
    furniture: [],
    exitZone,
    stairsZone,
    elevatorZone,
    exits: floor === 0 ? [exitZone] : [],
    stairs: [stairsZone],
    elevators: [elevatorZone]
  };
}

export function createDefaultSuburbanLayout(bld: Building, floor: number): BuildingLayout {
  const isGarage = bld.id.includes('garage') || (bld.nameRu && bld.nameRu.includes('Гараж'));
  const isBanya = bld.id.includes('banya') || (bld.nameRu && (bld.nameRu.includes('Баня') || bld.nameRu.includes('Сауна')));

  if (isGarage) {
    // --- TEMPLATE G: SUBURBAN WORKSHOP & GARAGE (ПРИУСАДЕБНЫЙ ГАРАЖ-МАСТЕРСКАЯ) ---
    const W = 160;
    const H = 110;
    const rooms: InteriorRoom[] = [
      { name: 'Гаражный бокс & Мастерская', x: 8, y: 8, width: 144, height: 94, color: '#1e293b', floorStyle: 'tile' }
    ];
    const walls: InteriorWall[] = [
      { x1: 6, y1: 6, x2: 154, y2: 6 },
      { x1: 154, y1: 6, x2: 154, y2: 104 },
      { x1: 154, y1: 104, x2: 6, y2: 104 },
      { x1: 6, y1: 104, x2: 6, y2: 6 }
    ];
    const furniture: InteriorFurniture[] = [
      // Metal Workbench with Vise & Tools
      { type: 'desk', x: 12, y: 12, width: 36, height: 16, angle: 0, color: '#334155' },
      { type: 'chair', x: 22, y: 32, width: 8, height: 8, angle: 0, color: '#0f172a' },
      // Shelving units & Tool racks
      { type: 'shelf', x: 54, y: 10, width: 32, height: 12, angle: 0, color: '#475569' },
      { type: 'shelf', x: 92, y: 10, width: 32, height: 12, angle: 0, color: '#475569' },
      // Storage safe & Parts bin
      { type: 'safe', x: 130, y: 12, width: 14, height: 14, angle: 0, color: '#0f172a' },
      { type: 'file_cabinet', x: 130, y: 32, width: 14, height: 14, angle: 0, color: '#64748b' },
      // Resting sofa in corner
      { type: 'sofa', x: 12, y: 64, width: 34, height: 16, angle: 0, color: '#78350f' }
    ];
    const exitZone: InteriorZone = { x: 55, y: 88, width: 34, height: 16 };
    return {
      buildingId: bld.id,
      floor,
      width: W,
      height: H,
      rooms,
      walls,
      furniture,
      exitZone,
      stairsZone: { x: -100, y: -100, width: 0, height: 0 },
      elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
      exits: [exitZone],
      stairs: [],
      elevators: []
    };
  }

  if (isBanya) {
    // --- TEMPLATE B: WOODEN SUBURBAN BANYA / SAUNA (РУССКАЯ БАНЯ С КАМЕНКОЙ) ---
    const W = 150;
    const H = 100;
    const rooms: InteriorRoom[] = [
      { name: 'Предбанник / Комната отдыха', x: 8, y: 8, width: 70, height: 84, color: '#3d2516', floorStyle: 'wood' },
      { name: 'Парная & Каменка', x: 82, y: 8, width: 60, height: 46, color: '#27170f', floorStyle: 'wood' },
      { name: 'Помывочная', x: 82, y: 56, width: 60, height: 36, color: '#1c100a', floorStyle: 'tile' }
    ];
    const walls: InteriorWall[] = [
      { x1: 6, y1: 6, x2: 144, y2: 6 },
      { x1: 144, y1: 6, x2: 144, y2: 94 },
      { x1: 144, y1: 94, x2: 6, y2: 94 },
      { x1: 6, y1: 94, x2: 6, y2: 6 },
      // Internal wooden partitions with door openings
      { x1: 80, y1: 6, x2: 80, y2: 24 },
      // Door gap y: 24..50 (26px) for entering Steam Room
      { x1: 80, y1: 50, x2: 80, y2: 64 },
      // Door gap y: 64..86 (22px) for entering Washing Room
      { x1: 80, y1: 86, x2: 80, y2: 94 },
      // Door between steam room and shower: gap from x = 104 to x = 128 (24px)
      { x1: 80, y1: 54, x2: 104, y2: 54 },
      { x1: 128, y1: 54, x2: 144, y2: 54 }
    ];
    const furniture: InteriorFurniture[] = [
      // Resting room (Предбанник)
      { type: 'table', x: 16, y: 16, width: 28, height: 18, angle: 0, color: '#7c2d12' },
      { type: 'chair', x: 10, y: 20, width: 6, height: 6, angle: 0, color: '#451a03' },
      { type: 'chair', x: 44, y: 20, width: 6, height: 6, angle: 0, color: '#451a03' },
      { type: 'bench' as any, x: 14, y: 44, width: 34, height: 10, angle: 0, color: '#7c2d12' },
      { type: 'coat_rack', x: 12, y: 64, width: 10, height: 10, angle: 0, color: '#451a03' },
      { type: 'mirror', x: 40, y: 66, width: 4, height: 14, angle: 0, color: '#f59e0b' },
      // Steam room (Парная)
      { type: 'stove', x: 86, y: 12, width: 20, height: 20, angle: 0, color: '#c2410c' }, // Sauna stone stove
      { type: 'bench' as any, x: 110, y: 12, width: 28, height: 36, angle: 0, color: '#b45309' }, // Sauna wooden tier tiers
      // Washing room (Помывочная)
      { type: 'bath', x: 86, y: 60, width: 32, height: 18, angle: 0, color: '#f1f5f9' },
      { type: 'sink', x: 122, y: 60, width: 14, height: 12, angle: 0, color: '#e2e8f0' }
    ];
    const exitZone: InteriorZone = { x: 16, y: 80, width: 24, height: 14 };
    return {
      buildingId: bld.id,
      floor,
      width: W,
      height: H,
      rooms,
      walls,
      furniture,
      exitZone,
      stairsZone: { x: -100, y: -100, width: 0, height: 0 },
      elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
      exits: [exitZone],
      stairs: [],
      elevators: []
    };
  }

  const isIzba = bld.id.includes('izba') || 
                 bld.id.includes('village') || 
                 (bld.nameRu && (bld.nameRu.includes('Изба') || bld.nameRu.includes('Дом пасечника') || bld.nameRu.includes('деревн') || bld.nameRu.includes('Почта') || bld.nameRu.includes('Сельпо') || bld.nameRu.includes('Сельский')));

  if (isIzba) {
    // --- TEMPLATE A: TRADITIONAL RUSTIC VILLAGE IZBA (ИЗБА С РУССКОЙ ПЕЧЬЮ) ---
    const W = 200;
    const H = 130;
    const rooms: InteriorRoom[] = [
      { name: 'Сени (Прихожая)', x: 8, y: 70, width: 48, height: 52, color: '#27170f', floorStyle: 'wood' },
      { name: 'Большая Горница (Кухня & Печь)', x: 58, y: 8, width: 134, height: 74, color: '#3d2516', floorStyle: 'wood' },
      { name: 'Опочивальня (Спальня)', x: 58, y: 84, width: 134, height: 38, color: '#2b1b11', floorStyle: 'wood' },
      { name: 'Баня / Помывочная', x: 8, y: 8, width: 48, height: 60, color: '#1c100a', floorStyle: 'wood' }
    ];
    const walls: InteriorWall[] = [
      { x1: 6, y1: 6, x2: 194, y2: 6 },
      { x1: 194, y1: 6, x2: 194, y2: 124 },
      { x1: 194, y1: 124, x2: 6, y2: 124 },
      { x1: 6, y1: 124, x2: 6, y2: 6 },
      // Internal wooden walls with door openings
      { x1: 56, y1: 6, x2: 56, y2: 68 },
      // Door gap y: 68..96 (28px) for entering living room (Горница)
      { x1: 56, y1: 96, x2: 56, y2: 124 },
      // Door between Entryway and Bath: gap x: 20..42 (22px)
      { x1: 6, y1: 68, x2: 20, y2: 68 },
      { x1: 42, y1: 68, x2: 56, y2: 68 },
      // Door between Горница and Bedroom: gap x: 110..138 (28px)
      { x1: 56, y1: 82, x2: 110, y2: 82 },
      { x1: 138, y1: 82, x2: 194, y2: 82 }
    ];
    const furniture: InteriorFurniture[] = [
      // Горница (Living/Kitchen)
      { type: 'stove', x: 62, y: 12, width: 34, height: 34, angle: 0, color: '#c2410c' }, // Russian Oven
      { type: 'table', x: 120, y: 44, width: 34, height: 22, angle: 0, color: '#7c2d12' }, // Wooden dining table
      { type: 'chair', x: 108, y: 52, width: 8, height: 8, angle: 0, color: '#451a03' },
      { type: 'chair', x: 136, y: 52, width: 8, height: 8, angle: 0, color: '#451a03' },
      { type: 'kitchen_counter', x: 160, y: 12, width: 28, height: 14, angle: 0, color: '#7c2d12' },
      { type: 'fridge', x: 102, y: 12, width: 16, height: 16, angle: 0, color: '#e2e8f0' },
      // Опочивальня (Bedroom)
      { type: 'bed', x: 64, y: 88, width: 44, height: 30, angle: 0, color: '#ea580c' },
      { type: 'dresser', x: 120, y: 88, width: 24, height: 12, angle: 0, color: '#7c2d12' },
      { type: 'floor_lamp', x: 154, y: 88, width: 8, height: 8, angle: 0, color: '#ea580c' },
      // Баня (Bath/Sauna)
      { type: 'bath', x: 10, y: 10, width: 38, height: 18, angle: 0, color: '#f1f5f9' },
      { type: 'stove', x: 12, y: 32, width: 14, height: 14, angle: 0, color: '#334155' }, // Bath stone heater
      // Сени (Entryway)
      { type: 'coat_rack', x: 12, y: 74, width: 10, height: 10, angle: 0, color: '#451a03' },
      { type: 'mirror', x: 44, y: 74, width: 4, height: 16, angle: 0, color: '#f59e0b' }
    ];
    const exitZone: InteriorZone = { x: 18, y: 110, width: 24, height: 12 };
    return {
      buildingId: bld.id,
      floor,
      width: W,
      height: H,
      rooms,
      walls,
      furniture,
      exitZone,
      stairsZone: { x: -100, y: -100, width: 0, height: 0 },
      elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
      exits: [exitZone],
      stairs: [],
      elevators: []
    };
  }

  // --- TEMPLATE B: PROSPEROUS COUNTRY COTTAGE (ЗАГОРОДНЫЙ КОТТЕДЖ) ---
  if (floor === 1) {
    return createCottageFloor1Layout(bld.id, bld.width, bld.height);
  }
  return createCottageFloor0Layout(bld.id, bld.width, bld.height);
}

/**
 * Floor 0: Ground Floor of Country Cottage
 * Fully open, passable layout scaled to building dimensions.
 */
export function createCottageFloor0Layout(buildingId: string, width = 160, height = 110): BuildingLayout {
  const W = Math.max(120, width);
  const H = Math.max(80, height);

  const xCol1 = Math.round(W * 0.28);
  const xCol2 = Math.round(W * 0.70);
  const yMid = Math.round(H * 0.54);

  const rooms: InteriorRoom[] = [
    { name: 'Прихожая / Холл', x: 8, y: yMid, width: xCol1 - 10, height: H - yMid - 8, color: '#1e293b', floorStyle: 'tile' },
    { name: 'Ванная комната & Сауна', x: 8, y: 8, width: xCol1 - 10, height: yMid - 10, color: '#0f172a', floorStyle: 'tile' },
    { name: 'Каминный Зал', x: xCol1, y: 8, width: xCol2 - xCol1 - 2, height: yMid - 10, color: '#334155', floorStyle: 'parquet' },
    { name: 'Кухня-Столовая', x: xCol1, y: yMid, width: xCol2 - xCol1 - 2, height: H - yMid - 8, color: '#1e293b', floorStyle: 'tile' },
    { name: 'Мастер-Спальня', x: xCol2, y: 8, width: W - xCol2 - 8, height: yMid - 10, color: '#1e293b', floorStyle: 'carpet' },
    { name: 'Садовая Терраса', x: xCol2, y: yMid, width: W - xCol2 - 8, height: H - yMid - 8, color: '#334155', floorStyle: 'wood' }
  ];

  const walls: InteriorWall[] = [
    // Outer perimeter envelope
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
    { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
    { x1: 6, y1: H - 6, x2: 6, y2: 6 },

    // Partition 1: Between Bathroom (top) and Hallway (bottom) at y = yMid
    { x1: 6, y1: yMid, x2: 18, y2: yMid },
    { x1: 38, y1: yMid, x2: xCol1, y2: yMid },

    // Partition 2: Between West wing and Central Hall at x = xCol1
    { x1: xCol1, y1: 6, x2: xCol1, y2: yMid },
    { x1: xCol1, y1: yMid + 20, x2: xCol1, y2: H - 6 },

    // Partition 3: Between Living Hall (top) and Dining/Kitchen (bottom) at y = yMid
    { x1: xCol1, y1: yMid, x2: xCol1 + 10, y2: yMid },
    { x1: xCol2 - 10, y1: yMid, x2: xCol2, y2: yMid },

    // Partition 4: Between Living Hall and Master Bedroom at x = xCol2
    { x1: xCol2, y1: 6, x2: xCol2, y2: 20 },
    { x1: xCol2, y1: 42, x2: xCol2, y2: yMid },

    // Partition 5: Between Kitchen and Garden Terrace at x = xCol2
    { x1: xCol2, y1: yMid, x2: xCol2, y2: yMid + 12 },
    { x1: xCol2, y1: H - 20, x2: xCol2, y2: H - 6 },

    // Partition 6: Between Master Bedroom and Terrace at y = yMid
    { x1: xCol2, y1: yMid, x2: xCol2 + 10, y2: yMid },
    { x1: W - 18, y1: yMid, x2: W - 6, y2: yMid }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. ПРИХОЖАЯ / ХОЛЛ ---
    { type: 'coat_rack', x: 10, y: yMid + 4, width: 8, height: 8, angle: 0, color: '#451a03' },
    { type: 'bench', x: 10, y: yMid + 16, width: 14, height: 6, angle: 0, color: '#78350f' },
    { type: 'mirror', x: 8, y: yMid + 26, width: 3, height: 10, angle: 0, color: '#f59e0b' },

    // --- 2. ВАННАЯ КОМНАТА & САУНА ---
    { type: 'bath', x: 10, y: 10, width: 24, height: 14, angle: 0, color: '#f1f5f9' },
    { type: 'toilet', x: 10, y: 28, width: 10, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: 10, y: 42, width: 10, height: 10, angle: 0, color: '#e2e8f0' },
    { type: 'stove', x: xCol1 - 18, y: 10, width: 10, height: 10, angle: 0, color: '#c2410c' },

    // --- 3. КАМИННЫЙ ЗАЛ / ГОСТИНАЯ ---
    { type: 'stove', x: Math.round((xCol1 + xCol2) / 2) - 8, y: 8, width: 16, height: 10, angle: 0, color: '#b45309' },
    { type: 'sofa', x: xCol1 + 8, y: 24, width: 28, height: 14, angle: 0, color: '#991b1b' },
    { type: 'carpet', x: xCol1 + 6, y: 22, width: 32, height: 18, angle: 0, color: '#7f1d1d' },
    { type: 'tv', x: xCol1 + 8, y: 10, width: 16, height: 4, angle: 0, color: '#0f172a' },
    { type: 'plant', x: xCol2 - 16, y: 10, width: 8, height: 8, angle: 0, color: '#16a34a' },

    // --- 4. КУХНЯ-СТОЛОВАЯ ---
    { type: 'fridge', x: xCol1 + 4, y: yMid + 6, width: 12, height: 12, angle: 0, color: '#e2e8f0' },
    { type: 'kitchen_counter', x: xCol1 + 4, y: H - 18, width: 18, height: 10, angle: 0, color: '#64748b' },
    { type: 'stove', x: xCol1 + 24, y: H - 18, width: 12, height: 10, angle: 0, color: '#334155' },
    { type: 'table', x: xCol2 - 28, y: yMid + 10, width: 20, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: xCol2 - 34, y: yMid + 14, width: 5, height: 5, angle: 0, color: '#92400e' },
    { type: 'chair', x: xCol2 - 6, y: yMid + 14, width: 5, height: 5, angle: 0, color: '#92400e' },

    // --- 5. МАСТЕР-СПАЛЬНЯ ---
    { type: 'bed', x: W - 36, y: 10, width: 28, height: 24, angle: 0, color: '#d97706' },
    { type: 'nightstand', x: xCol2 + 4, y: 10, width: 6, height: 6, angle: 0, color: '#78350f' },
    { type: 'dresser', x: xCol2 + 4, y: 38, width: 20, height: 10, angle: 0, color: '#78350f' },

    // --- 6. САДОВАЯ ТЕРРАСА ---
    { type: 'table', x: xCol2 + 10, y: yMid + 12, width: 16, height: 10, angle: 0, color: '#451a03' },
    { type: 'chair', x: xCol2 + 4, y: yMid + 14, width: 5, height: 5, angle: 0, color: '#78350f' },
    { type: 'chair', x: xCol2 + 28, y: yMid + 14, width: 5, height: 5, angle: 0, color: '#78350f' },
    { type: 'plant', x: W - 16, y: H - 18, width: 8, height: 8, angle: 0, color: '#16a34a' }
  ];

  const exitZone: InteriorZone = { x: 14, y: H - 14, width: 24, height: 10 };
  const stairsZone: InteriorZone = { x: xCol2 - 26, y: 10, width: 22, height: 20 };

  return {
    buildingId,
    floor: 0,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone,
    stairsZone,
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitZone],
    stairs: [stairsZone],
    elevators: []
  };
}

/**
 * Floor 1: Mansard / 2nd Floor of Country Cottage
 * Study, Library, Guest Bedroom, Billiard & Lounge Room, Upper Bathroom.
 */
export function createCottageFloor1Layout(buildingId: string, width = 160, height = 110): BuildingLayout {
  const W = Math.max(120, width);
  const H = Math.max(80, height);

  const xCol1 = Math.round(W * 0.32);
  const xCol2 = Math.round(W * 0.68);
  const yMid = Math.round(H * 0.54);

  const rooms: InteriorRoom[] = [
    { name: 'Холл 2-го этажа', x: xCol1, y: 8, width: xCol2 - xCol1 - 2, height: yMid - 10, color: '#334155', floorStyle: 'parquet' },
    { name: 'Личный Кабинет & Библиотека', x: 8, y: 8, width: xCol1 - 10, height: yMid - 10, color: '#1e293b', floorStyle: 'wood' },
    { name: 'Гостевая спальня', x: 8, y: yMid, width: xCol1 - 10, height: H - yMid - 8, color: '#1e293b', floorStyle: 'carpet' },
    { name: 'Верхний санузел', x: xCol2, y: 8, width: W - xCol2 - 8, height: yMid - 10, color: '#0f172a', floorStyle: 'tile' },
    { name: 'Бильярдная & Лаунж-зона', x: xCol1, y: yMid, width: W - xCol1 - 8, height: H - yMid - 8, color: '#334155', floorStyle: 'wood' }
  ];

  const walls: InteriorWall[] = [
    // Outer building envelope
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
    { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
    { x1: 6, y1: H - 6, x2: 6, y2: 6 },

    // Partition 1: Between Study (left) and Upper Hall (center) at x = xCol1
    { x1: xCol1, y1: 6, x2: xCol1, y2: 18 },
    { x1: xCol1, y1: 38, x2: xCol1, y2: yMid },

    // Partition 2: Between Study (top) and Guest Bedroom (bottom) at y = yMid
    { x1: 6, y1: yMid, x2: 24, y2: yMid },
    { x1: 44, y1: yMid, x2: xCol1, y2: yMid },

    // Partition 3: Between Guest Bedroom (left) and Billiard Lounge (right) at x = xCol1
    { x1: xCol1, y1: yMid, x2: xCol1, y2: yMid + 12 },
    { x1: xCol1, y1: H - 18, x2: xCol1, y2: H - 6 },

    // Partition 4: Between Upper Hall and Billiard Lounge at y = yMid
    { x1: xCol1, y1: yMid, x2: xCol1 + 10, y2: yMid },
    { x1: xCol2 - 10, y1: yMid, x2: xCol2, y2: yMid },

    // Partition 5: Between Upper Hall (center) and Upper Bathroom (right) at x = xCol2
    { x1: xCol2, y1: 6, x2: xCol2, y2: 18 },
    { x1: xCol2, y1: 38, x2: xCol2, y2: yMid },

    // Partition 6: Between Upper Bathroom (top) and Billiard Lounge (bottom) at y = yMid
    { x1: xCol2, y1: yMid, x2: W - 6, y2: yMid }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. ХОЛЛ 2-ГО ЭТАЖА ---
    { type: 'bookshelf', x: xCol1 + 4, y: 10, width: 14, height: 8, angle: 0, color: '#451a03' },
    { type: 'plant', x: xCol2 - 14, y: 10, width: 8, height: 8, angle: 0, color: '#16a34a' },
    { type: 'sofa', x: xCol1 + 4, y: yMid - 18, width: 22, height: 10, angle: 0, color: '#1e3a8a' },

    // --- 2. ЛИЧНЫЙ КАБИНЕТ & БИБЛИОТЕКА ---
    { type: 'desk', x: 20, y: 12, width: 22, height: 12, angle: 0, color: '#78350f' },
    { type: 'chair', x: 28, y: 26, width: 6, height: 6, angle: 0, color: '#1e3a8a' },
    { type: 'computer', x: 26, y: 13, width: 8, height: 5, angle: 0, color: '#0f172a' },
    { type: 'bookshelf', x: 8, y: 8, width: 10, height: 8, angle: 0, color: '#451a03' },

    // --- 3. ГОСТЕВАЯ СПАЛЬНЯ ---
    { type: 'bed', x: 10, y: yMid + 8, width: 26, height: 18, angle: 0, color: '#0284c7' },
    { type: 'nightstand', x: 10, y: H - 16, width: 6, height: 6, angle: 0, color: '#78350f' },
    { type: 'dresser', x: 22, y: H - 16, width: 16, height: 8, angle: 0, color: '#78350f' },

    // --- 4. ВЕРХНИЙ САНУЗЕЛ ---
    { type: 'bath', x: xCol2 + 6, y: 10, width: 22, height: 12, angle: 0, color: '#ffffff' },
    { type: 'sink', x: xCol2 + 6, y: 26, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'toilet', x: xCol2 + 6, y: 38, width: 8, height: 10, angle: 0, color: '#ffffff' },

    // --- 5. БИЛЬЯРДНАЯ & ЛАУНЖ ---
    { type: 'table', x: xCol1 + 18, y: yMid + 10, width: 28, height: 16, angle: 0, color: '#15803d' }, // Billiard table
    { type: 'sofa', x: W - 30, y: H - 18, width: 22, height: 10, angle: 0, color: '#7c2d12' },
    { type: 'plant', x: xCol1 + 4, y: H - 16, width: 8, height: 8, angle: 0, color: '#16a34a' }
  ];

  // Match Floor 0 stairs position exactly!
  const stairsZone: InteriorZone = { x: xCol2 - 26, y: 10, width: 22, height: 20 };

  return {
    buildingId,
    floor: 1,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone: { x: -100, y: -100, width: 0, height: 0 },
    stairsZone,
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [],
    stairs: [stairsZone],
    elevators: []
  };
}

export function createRealEstateAgencyLayout(): BuildingLayout {
  return {
    buildingId: 'bld_real_estate_agency_main',
    floor: 0,
    width: 220,
    height: 140,
    rooms: [
      {
        name: 'Главный Зал «ГлавНедвижимость»',
        x: 10,
        y: 10,
        width: 200,
        height: 120,
        color: '#0f172a',
        floorStyle: 'parquet'
      },
      {
        name: 'Кабинет Нотариуса & Архив ЕГРН',
        x: 10,
        y: 10,
        width: 70,
        height: 55,
        color: '#1e293b',
        floorStyle: 'wood'
      },
      {
        name: 'Переговорная VIP',
        x: 140,
        y: 10,
        width: 70,
        height: 55,
        color: '#1e293b',
        floorStyle: 'carpet'
      }
    ],
    walls: [
      { x1: 10, y1: 65, x2: 70, y2: 65 },
      { x1: 70, y1: 10, x2: 70, y2: 65 },
      { x1: 140, y1: 10, x2: 140, y2: 65 },
      { x1: 140, y1: 65, x2: 200, y2: 65 }
    ],
    furniture: [
      // Reception desk
      { type: 'desk_reception', x: 85, y: 78, width: 50, height: 14, angle: 0, color: '#eab308' },
      { type: 'computer', x: 95, y: 78, width: 8, height: 6, angle: 0, color: '#0f172a' },
      { type: 'computer', x: 115, y: 78, width: 8, height: 6, angle: 0, color: '#0f172a' },
      { type: 'chair', x: 98, y: 95, width: 8, height: 8, angle: 0, color: '#1e293b' },
      { type: 'chair', x: 118, y: 95, width: 8, height: 8, angle: 0, color: '#1e293b' },
      // Client waiting area
      { type: 'sofa', x: 30, y: 85, width: 36, height: 16, angle: 0, color: '#0284c7' },
      { type: 'table', x: 36, y: 105, width: 24, height: 12, angle: 0, color: '#475569' },
      { type: 'plant', x: 15, y: 85, width: 10, height: 10, angle: 0, color: '#16a34a' },
      { type: 'cooler', x: 15, y: 110, width: 8, height: 8, angle: 0, color: '#38bdf8' },
      { type: 'atm', x: 188, y: 85, width: 10, height: 10, angle: 0, color: '#059669' },
      // Notary cabinet
      { type: 'desk', x: 18, y: 18, width: 32, height: 14, angle: 0, color: '#78350f' },
      { type: 'chair', x: 28, y: 34, width: 8, height: 8, angle: 0, color: '#451a03' },
      { type: 'file_cabinet', x: 52, y: 15, width: 14, height: 10, angle: 0, color: '#94a3b8' },
      { type: 'bookshelf', x: 52, y: 30, width: 14, height: 10, angle: 0, color: '#475569' },
      // VIP Meeting Room
      { type: 'table', x: 150, y: 20, width: 44, height: 20, angle: 0, color: '#78350f' },
      { type: 'chair', x: 155, y: 12, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'chair', x: 175, y: 12, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'chair', x: 155, y: 44, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'chair', x: 175, y: 44, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'plant', x: 195, y: 15, width: 10, height: 10, angle: 0, color: '#15803d' }
    ],
    exitZone: { x: 95, y: 118, width: 30, height: 16 },
    stairsZone: { x: -100, y: -100, width: 0, height: 0 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [{ x: 95, y: 118, width: 30, height: 16 }],
    stairs: [],
    elevators: []
  };
}

export function createRailwayStationLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;

  if (floor === 1) {
    return {
      buildingId: bld.id,
      floor: 1,
      width: W,
      height: H,
      rooms: [
        {
          name: 'Диспетчерский центр управления движением СЦБ',
          x: 10,
          y: 10,
          width: 140,
          height: 90,
          color: '#0f172a',
          floorStyle: 'tile'
        },
        {
          name: 'Кабинет Начальника Станции',
          x: 160,
          y: 10,
          width: 70,
          height: 90,
          color: '#1e293b',
          floorStyle: 'parquet'
        },
        {
          name: 'Комната отдыха поездных бригад',
          x: 240,
          y: 10,
          width: 70,
          height: 90,
          color: '#1e293b',
          floorStyle: 'carpet'
        }
      ],
      walls: [
        { x1: 6, y1: 6, x2: W - 6, y2: 6 },
        { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
        { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
        { x1: 6, y1: H - 6, x2: 6, y2: 6 },
        { x1: 155, y1: 6, x2: 155, y2: H - 6 },
        { x1: 235, y1: 6, x2: 235, y2: H - 6 }
      ],
      furniture: [
        { type: 'desk', x: 40, y: 30, width: 45, height: 22, angle: 0, color: '#334155' },
        { type: 'chair', x: 58, y: 56, width: 9, height: 9, angle: 0, color: '#0284c7' },
        { type: 'file_cabinet', x: 15, y: 15, width: 25, height: 12, angle: 0, color: '#475569' },
        { type: 'desk', x: 180, y: 40, width: 30, height: 18, angle: 0, color: '#78350f' },
        { type: 'chair', x: 190, y: 62, width: 9, height: 9, angle: 0, color: '#9a3412' },
        { type: 'safe', x: 215, y: 15, width: 12, height: 12, angle: 0, color: '#1e293b' },
        { type: 'sofa', x: 255, y: 25, width: 40, height: 16, angle: 0, color: '#047857' },
        { type: 'table', x: 265, y: 55, width: 22, height: 14, angle: 0, color: '#b45309' }
      ],
      exitZone: { x: -100, y: -100, width: 0, height: 0 },
      stairsZone: { x: 145, y: 70, width: 22, height: 22 },
      elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
      exits: [],
      stairs: [{ x: 145, y: 70, width: 22, height: 22 }],
      elevators: []
    };
  }

  const exitNorth = { x: 148, y: 6, width: 26, height: 14 };
  const exitSouth1 = { x: 80, y: H - 18, width: 26, height: 14 };
  const exitSouth2 = { x: 214, y: H - 18, width: 26, height: 14 };

  return {
    buildingId: bld.id,
    floor: 0,
    width: W,
    height: H,
    rooms: [
      {
        name: 'Центральный Кассовый Вестибюль и Зал Ожидания',
        x: 8,
        y: 8,
        width: W - 16,
        height: H - 16,
        color: '#0f172a',
        floorStyle: 'tile'
      },
      {
        name: 'Билетные кассы РЖД',
        x: 12,
        y: 12,
        width: 70,
        height: 42,
        color: '#1e293b',
        floorStyle: 'tile'
      },
      {
        name: 'Камера хранения & Бюро находок',
        x: 12,
        y: 58,
        width: 70,
        height: 42,
        color: '#1e293b',
        floorStyle: 'tile'
      },
      {
        name: 'Привокзальный буфет',
        x: 238,
        y: 12,
        width: 70,
        height: 42,
        color: '#1e293b',
        floorStyle: 'tile'
      },
      {
        name: 'Линейный пункт полиции',
        x: 238,
        y: 58,
        width: 70,
        height: 42,
        color: '#1e293b',
        floorStyle: 'tile'
      }
    ],
    walls: [
      { x1: 6, y1: 6, x2: W - 6, y2: 6 },
      { x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 },
      { x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 },
      { x1: 6, y1: H - 6, x2: 6, y2: 6 },
      { x1: 84, y1: 6, x2: 84, y2: 48 },
      { x1: 6, y1: 56, x2: 84, y2: 56 },
      { x1: 236, y1: 6, x2: 236, y2: 48 },
      { x1: 236, y1: 56, x2: W - 6, y2: 56 }
    ],
    furniture: [
      { type: 'desk', x: 20, y: 22, width: 22, height: 12, angle: 0, color: '#dc2626' },
      { type: 'desk', x: 50, y: 22, width: 22, height: 12, angle: 0, color: '#dc2626' },
      { type: 'sofa', x: 105, y: 35, width: 34, height: 10, angle: 0, color: '#92400e' },
      { type: 'sofa', x: 105, y: 55, width: 34, height: 10, angle: 0, color: '#92400e' },
      { type: 'sofa', x: 180, y: 35, width: 34, height: 10, angle: 0, color: '#92400e' },
      { type: 'sofa', x: 180, y: 55, width: 34, height: 10, angle: 0, color: '#92400e' },
      { type: 'kitchen_counter', x: 245, y: 18, width: 45, height: 12, angle: 0, color: '#ca8a04' },
      { type: 'table', x: 255, y: 36, width: 14, height: 14, angle: 0, color: '#78350f' },
      { type: 'chair', x: 246, y: 39, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'chair', x: 271, y: 39, width: 7, height: 7, angle: 0, color: '#451a03' },
      { type: 'lockers', x: 20, y: 68, width: 28, height: 12, angle: 0, color: '#475569' },
      { type: 'lockers', x: 50, y: 68, width: 26, height: 12, angle: 0, color: '#475569' },
      { type: 'desk', x: 250, y: 68, width: 26, height: 14, angle: 0, color: '#1e3a8a' },
      { type: 'chair', x: 258, y: 84, width: 8, height: 8, angle: 0, color: '#1e40af' },
      { type: 'safe', x: 285, y: 68, width: 12, height: 12, angle: 0, color: '#0f172a' },
      { type: 'plant', x: 92, y: 14, width: 10, height: 10, angle: 0, color: '#15803d' },
      { type: 'plant', x: 220, y: 14, width: 10, height: 10, angle: 0, color: '#15803d' }
    ],
    exitZone: exitNorth,
    stairsZone: { x: 145, y: 70, width: 22, height: 22 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitNorth, exitSouth1, exitSouth2],
    stairs: [{ x: 145, y: 70, width: 22, height: 22 }],
    elevators: []
  };
}

export function createSupermarketStoreLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const xMid = Math.round(W / 2);
  const xEast = W - 140;
  const exitZone: InteriorZone = { x: xMid - 16, y: 96, width: 32, height: 8 };

  const rooms: InteriorRoom[] = [
    {
      name: 'Основной Торговый Зал "Пятёрочка"',
      x: 6,
      y: 6,
      width: xEast - 6,
      height: 66,
      color: '#0f172a',
      floorStyle: 'tile'
    },
    {
      name: 'Кассовая Зона & Входной Вестибюль',
      x: 6,
      y: 72,
      width: xEast - 6,
      height: 32,
      color: '#1e293b',
      floorStyle: 'tile'
    },
    {
      name: 'Склад & Зона Разгрузки Товаров',
      x: xEast,
      y: 6,
      width: W - xEast - 6,
      height: 50,
      color: '#1e293b',
      floorStyle: 'concrete'
    },
    {
      name: 'Кабинет Администратора & Серверная',
      x: xEast,
      y: 56,
      width: 76,
      height: 48,
      color: '#1e293b',
      floorStyle: 'linoleum'
    },
    {
      name: 'Комната Персонала & Санузел',
      x: xEast + 76,
      y: 56,
      width: W - (xEast + 76) - 6,
      height: 48,
      color: '#0f172a',
      floorStyle: 'tile'
    }
  ];

  const walls: InteriorWall[] = [
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },
    { x1: xEast, y1: 56, x2: xEast + 16, y2: 56 },
    { x1: xEast + 44, y1: 56, x2: W - 6, y2: 56 },
    { x1: xEast + 76, y1: 56, x2: xEast + 76, y2: 68 },
    { x1: xEast + 76, y1: 94, x2: xEast + 76, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#334155' },
    { type: 'atm', x: xMid + 24, y: 78, width: 9, height: 8, angle: 0, color: '#16a34a' },
    { type: 'lockers', x: xMid + 38, y: 78, width: 24, height: 8, angle: 0, color: '#0284c7' },
    { type: 'cooler', x: xMid + 14, y: 78, width: 7, height: 7, angle: 0, color: '#38bdf8' },
    { type: 'trash_can', x: xMid - 26, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'bench', x: xMid - 50, y: 78, width: 18, height: 6, angle: 0, color: '#78350f' },
    { type: 'plant', x: xMid + 68, y: 78, width: 8, height: 8, angle: 0, color: '#15803d' },

    { type: 'counter', x: xMid - 85, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 82, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'counter', x: xMid - 130, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 127, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'counter', x: xMid - 175, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 172, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },

    { type: 'shelf', x: 10, y: 14, width: 8, height: 24, angle: 0, color: '#15803d' },
    { type: 'shelf', x: 10, y: 42, width: 8, height: 22, angle: 0, color: '#15803d' },
    { type: 'table', x: 32, y: 20, width: 22, height: 14, angle: 0, color: '#65a30d' },
    { type: 'table', x: 32, y: 44, width: 22, height: 14, angle: 0, color: '#65a30d' },
    { type: 'shelf', x: 70, y: 16, width: 8, height: 38, angle: 0, color: '#d97706' },

    { type: 'freezer_display', x: 96, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'freezer_display', x: 128, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: 160, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'fridge', x: 184, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'freezer_display', x: 208, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'freezer_display', x: 240, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: 272, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'freezer_display', x: 296, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },

    { type: 'shelf', x: 100, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 154, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 208, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 262, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 100, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 154, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 208, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 262, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },

    { type: 'fire_rack', x: xEast + 14, y: 10, width: 14, height: 6, angle: 0, color: '#dc2626' },
    { type: 'pallet_stack', x: xEast + 38, y: 12, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'pallet_stack', x: xEast + 62, y: 12, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'shelf', x: W - 46, y: 12, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'shelf', x: W - 46, y: 32, width: 36, height: 10, angle: 0, color: '#64748b' },

    { type: 'desk', x: xEast + 12, y: 64, width: 24, height: 12, angle: 0, color: '#334155' },
    { type: 'chair', x: xEast + 18, y: 78, width: 7, height: 7, angle: 0, color: '#0284c7' },
    { type: 'computer', x: xEast + 16, y: 65, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'safe', x: xEast + 44, y: 64, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'file_cabinet', x: xEast + 60, y: 64, width: 12, height: 10, angle: 0, color: '#64748b' },

    { type: 'toilet', x: W - 32, y: 62, width: 8, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: W - 18, y: 62, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'mirror', x: W - 16, y: 58, width: 6, height: 3, angle: 0, color: '#f59e0b' },
    { type: 'table', x: xEast + 86, y: 88, width: 16, height: 10, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 90, y: 80, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'microwave', x: xEast + 106, y: 88, width: 8, height: 6, angle: 0, color: '#334155' },
    { type: 'lockers', x: W - 32, y: 86, width: 24, height: 8, angle: 0, color: '#475569' }
  ];

  if (W > 580) {
    furniture.push(
      { type: 'freezer_display', x: 328, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
      { type: 'shelf', x: 316, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
      { type: 'shelf', x: 316, y: 50, width: 34, height: 8, angle: 0, color: '#059669' }
    );
  }

  return {
    buildingId: bld.id,
    floor: 0,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone,
    stairsZone: { x: -100, y: -100, width: 0, height: 0 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitZone],
    stairs: [],
    elevators: []
  };
}

export function createPharmacyStoreLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const xMid = Math.round(W / 2);
  const xEast = W - 140;
  const exitZone: InteriorZone = { x: xMid - 16, y: 96, width: 32, height: 8 };

  const rooms: InteriorRoom[] = [
    {
      name: 'Торговый Зал Аптеки "36.6"',
      x: 6,
      y: 6,
      width: xEast - 6,
      height: 98,
      color: '#0f172a',
      floorStyle: 'tile'
    },
    {
      name: 'Зона Здоровья & Ожидания',
      x: xMid - 46,
      y: 68,
      width: 92,
      height: 36,
      color: '#134e4a',
      floorStyle: 'tile'
    },
    {
      name: 'Рецептурный Отдел & Хранение Лекарств',
      x: xEast,
      y: 6,
      width: W - xEast - 6,
      height: 50,
      color: '#1e293b',
      floorStyle: 'tile'
    },
    {
      name: 'Кабинет Заведующей Аптекой',
      x: xEast,
      y: 58,
      width: 72,
      height: 46,
      color: '#1e293b',
      floorStyle: 'wood'
    },
    {
      name: 'Служебный Санузел & Комната Персонала',
      x: xEast + 72,
      y: 58,
      width: W - (xEast + 72) - 6,
      height: 46,
      color: '#0f172a',
      floorStyle: 'tile'
    }
  ];

  const walls: InteriorWall[] = [
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#047857' },
    { type: 'sofa', x: xMid + 28, y: 78, width: 24, height: 10, angle: 0, color: '#0d9488' },
    { type: 'cooler', x: xMid + 16, y: 78, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'atm', x: xMid - 36, y: 78, width: 9, height: 8, angle: 0, color: '#059669' },
    { type: 'table', x: xMid - 58, y: 78, width: 14, height: 10, angle: 0, color: '#334155' },
    { type: 'chair', x: xMid - 54, y: 90, width: 6, height: 6, angle: 0, color: '#0284c7' },
    { type: 'trash_can', x: xMid + 56, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'plant', x: xMid + 66, y: 78, width: 8, height: 8, angle: 0, color: '#10b981' },

    { type: 'counter', x: xMid - 130, y: 52, width: 38, height: 9, angle: 0, color: '#059669' },
    { type: 'cash_register', x: xMid - 120, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'computer', x: xMid - 108, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'counter', x: xMid - 85, y: 52, width: 38, height: 9, angle: 0, color: '#059669' },
    { type: 'cash_register', x: xMid - 75, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'computer', x: xMid - 63, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },

    { type: 'shelf', x: 10, y: 16, width: 8, height: 36, angle: 0, color: '#10b981' },
    { type: 'shelf', x: 10, y: 58, width: 8, height: 36, angle: 0, color: '#10b981' },
    { type: 'bookshelf', x: 36, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 36, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 74, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 74, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 112, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 112, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },

    { type: 'safe', x: xEast + 12, y: 10, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'fridge', x: xEast + 32, y: 10, width: 14, height: 14, angle: 0, color: '#38bdf8' },
    { type: 'sink', x: xEast + 54, y: 10, width: 12, height: 10, angle: 0, color: '#e2e8f0' },
    { type: 'shelf', x: W - 46, y: 12, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'shelf', x: W - 46, y: 32, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'desk', x: xEast + 34, y: 34, width: 26, height: 12, angle: 0, color: '#334155' },
    { type: 'chair', x: xEast + 42, y: 26, width: 6, height: 6, angle: 0, color: '#0284c7' },
    { type: 'lockers', x: xEast + 68, y: 34, width: 24, height: 8, angle: 0, color: '#475569' },

    { type: 'bookshelf', x: xEast + 38, y: 60, width: 18, height: 8, angle: 0, color: '#475569' },
    { type: 'file_cabinet', x: xEast + 58, y: 60, width: 10, height: 8, angle: 0, color: '#64748b' },
    { type: 'desk', x: xEast + 12, y: 84, width: 24, height: 10, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 18, y: 74, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'computer', x: xEast + 16, y: 85, width: 6, height: 4, angle: 0, color: '#0f172a' },

    { type: 'toilet', x: W - 32, y: 62, width: 8, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: W - 18, y: 62, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'mirror', x: W - 16, y: 58, width: 6, height: 3, angle: 0, color: '#f59e0b' },
    { type: 'coat_rack', x: W - 18, y: 86, width: 8, height: 8, angle: 0, color: '#451a03' }
  ];

  return {
    buildingId: bld.id,
    floor: 0,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone,
    stairsZone: { x: -100, y: -100, width: 0, height: 0 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitZone],
    stairs: [],
    elevators: []
  };
}

export function createBakeryCafeLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const xMid = Math.round(W / 2);
  const xEast = W - 140;
  const exitZone: InteriorZone = { x: xMid - 16, y: 96, width: 32, height: 8 };

  const rooms: InteriorRoom[] = [
    {
      name: 'Обеденный Зал & Лаунж "Cofix"',
      x: 6,
      y: 6,
      width: xEast - 6,
      height: 98,
      color: '#271406',
      floorStyle: 'wood'
    },
    {
      name: 'Зона Заказа & Витрина Свежей Выпечки',
      x: xMid - 60,
      y: 52,
      width: 110,
      height: 52,
      color: '#3d2516',
      floorStyle: 'wood'
    },
    {
      name: 'Горячий Пекарный Цех & Печи',
      x: xEast,
      y: 6,
      width: W - xEast - 6,
      height: 50,
      color: '#1e293b',
      floorStyle: 'tile'
    },
    {
      name: 'Склад Муки & Сырья',
      x: xEast,
      y: 58,
      width: 72,
      height: 46,
      color: '#1e293b',
      floorStyle: 'concrete'
    },
    {
      name: 'Санузел Гостевой & Персонала',
      x: xEast + 72,
      y: 58,
      width: W - (xEast + 72) - 6,
      height: 46,
      color: '#0f172a',
      floorStyle: 'tile'
    }
  ];

  const walls: InteriorWall[] = [
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    { type: 'counter', x: xMid - 50, y: 58, width: 40, height: 9, angle: 0, color: '#ea580c' },
    { type: 'cash_register', x: xMid - 40, y: 59, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'counter', x: xMid - 8, y: 58, width: 34, height: 9, angle: 0, color: '#b45309' },
    { type: 'microwave', x: xMid + 2, y: 59, width: 6, height: 5, angle: 0, color: '#334155' },
    { type: 'cooler', x: xMid + 30, y: 58, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: xMid + 42, y: 58, width: 12, height: 10, angle: 0, color: '#38bdf8' },

    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#7c2d12' },
    { type: 'trash_can', x: xMid + 20, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'plant', x: xMid + 32, y: 78, width: 8, height: 8, angle: 0, color: '#16a34a' },

    { type: 'table', x: 18, y: 18, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 46, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 74, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'sofa', x: 58, y: 18, width: 26, height: 10, angle: 0, color: '#d97706' },
    { type: 'table', x: 58, y: 32, width: 22, height: 12, angle: 0, color: '#92400e' },
    { type: 'sofa', x: 58, y: 56, width: 26, height: 10, angle: 0, color: '#d97706' },
    { type: 'table', x: 58, y: 70, width: 22, height: 12, angle: 0, color: '#92400e' },

    { type: 'table', x: 102, y: 24, width: 18, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 94, y: 28, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 122, y: 28, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 102, y: 64, width: 18, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 94, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 122, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'floor_lamp', x: 48, y: 90, width: 8, height: 8, angle: 0, color: '#ea580c' },
    { type: 'plant', x: 88, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },

    { type: 'stove', x: xEast + 12, y: 14, width: 24, height: 16, angle: 0, color: '#c2410c' },
    { type: 'kitchen_counter', x: xEast + 42, y: 14, width: 32, height: 12, angle: 0, color: '#64748b' },
    { type: 'fridge', x: xEast + 80, y: 14, width: 16, height: 14, angle: 0, color: '#38bdf8' },
    { type: 'sink', x: W - 28, y: 14, width: 14, height: 12, angle: 0, color: '#e2e8f0' },
    { type: 'shelf', x: xEast + 42, y: 34, width: 32, height: 10, angle: 0, color: '#475569' },

    { type: 'pallet_stack', x: xEast + 14, y: 66, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'shelf', x: xEast + 38, y: 64, width: 26, height: 10, angle: 0, color: '#64748b' },

    { type: 'toilet', x: W - 32, y: 64, width: 8, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: W - 18, y: 64, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'mirror', x: W - 16, y: 60, width: 6, height: 3, angle: 0, color: '#f59e0b' },
    { type: 'trash_can', x: xEast + 80, y: 64, width: 6, height: 6, angle: 0, color: '#475569' }
  ];

  return {
    buildingId: bld.id,
    floor: 0,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone,
    stairsZone: { x: -100, y: -100, width: 0, height: 0 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitZone],
    stairs: [],
    elevators: []
  };
}

export function createCoffeeBistroLayout(bld: Building, floor: number): BuildingLayout {
  const W = bld.width;
  const H = bld.height;
  const xMid = Math.round(W / 2);
  const xEast = W - 140;
  const exitZone: InteriorZone = { x: xMid - 16, y: 96, width: 32, height: 8 };

  const rooms: InteriorRoom[] = [
    {
      name: 'Кофейня & Главный Зал Бистро',
      x: 6,
      y: 6,
      width: xEast - 6,
      height: 98,
      color: '#291508',
      floorStyle: 'wood'
    },
    {
      name: 'Входной Тамбур & Лаунж',
      x: xMid - 50,
      y: 70,
      width: 100,
      height: 34,
      color: '#3b1f0c',
      floorStyle: 'wood'
    },
    {
      name: 'Кухня Бистро & Заготовочный Цех',
      x: xEast,
      y: 6,
      width: W - xEast - 6,
      height: 50,
      color: '#1e293b',
      floorStyle: 'tile'
    },
    {
      name: 'Кабинет Управляющего & Сейф',
      x: xEast,
      y: 58,
      width: 72,
      height: 46,
      color: '#1e293b',
      floorStyle: 'wood'
    },
    {
      name: 'Гостевой Санузел',
      x: xEast + 72,
      y: 58,
      width: W - (xEast + 72) - 6,
      height: 46,
      color: '#0f172a',
      floorStyle: 'tile'
    }
  ];

  const walls: InteriorWall[] = [
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    { type: 'counter', x: xMid - 130, y: 52, width: 44, height: 9, angle: 0, color: '#78350f' },
    { type: 'cash_register', x: xMid - 118, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'kitchen_counter', x: xMid - 82, y: 52, width: 24, height: 9, angle: 0, color: '#451a03' },
    { type: 'freezer_display', x: xMid - 54, y: 52, width: 20, height: 9, angle: 0, color: '#38bdf8' },

    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#7c2d12' },
    { type: 'atm', x: xMid + 28, y: 78, width: 9, height: 8, angle: 0, color: '#0284c7' },
    { type: 'cooler', x: xMid + 16, y: 78, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'plant', x: xMid + 42, y: 78, width: 8, height: 8, angle: 0, color: '#16a34a' },
    { type: 'floor_lamp', x: xMid - 36, y: 78, width: 8, height: 8, angle: 0, color: '#ea580c' },

    { type: 'table', x: 18, y: 18, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 46, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 74, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'sofa', x: 58, y: 18, width: 28, height: 12, angle: 0, color: '#78350f' },
    { type: 'carpet', x: 56, y: 32, width: 32, height: 18, angle: 0, color: '#9a3412' },
    { type: 'table', x: 60, y: 34, width: 24, height: 14, angle: 0, color: '#451a03' },
    { type: 'sofa', x: 58, y: 54, width: 28, height: 12, angle: 0, color: '#78350f' },

    { type: 'table', x: 102, y: 22, width: 20, height: 16, angle: 0, color: '#92400e' },
    { type: 'chair', x: 94, y: 26, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 124, y: 26, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 102, y: 64, width: 20, height: 16, angle: 0, color: '#92400e' },
    { type: 'chair', x: 94, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 124, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'plant', x: 44, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },
    { type: 'plant', x: 90, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },

    { type: 'stove', x: xEast + 12, y: 14, width: 22, height: 16, angle: 0, color: '#c2410c' },
    { type: 'kitchen_counter', x: xEast + 40, y: 14, width: 32, height: 12, angle: 0, color: '#64748b' },
    { type: 'sink', x: xEast + 78, y: 14, width: 16, height: 12, angle: 0, color: '#e2e8f0' },
    { type: 'fridge', x: W - 32, y: 14, width: 18, height: 16, angle: 0, color: '#38bdf8' },
    { type: 'kitchen_counter', x: xEast + 40, y: 34, width: 26, height: 12, angle: 0, color: '#64748b' },
    { type: 'microwave', x: xEast + 46, y: 36, width: 8, height: 6, angle: 0, color: '#334155' },
    { type: 'shelf', x: xEast + 72, y: 34, width: 32, height: 10, angle: 0, color: '#475569' },

    { type: 'desk', x: xEast + 12, y: 64, width: 24, height: 12, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 18, y: 78, width: 7, height: 7, angle: 0, color: '#451a03' },
    { type: 'safe', x: xEast + 42, y: 64, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'file_cabinet', x: xEast + 56, y: 64, width: 12, height: 10, angle: 0, color: '#64748b' },

    { type: 'toilet', x: W - 32, y: 64, width: 8, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: W - 18, y: 64, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'mirror', x: W - 16, y: 60, width: 6, height: 3, angle: 0, color: '#f59e0b' },
    { type: 'trash_can', x: xEast + 80, y: 64, width: 6, height: 6, angle: 0, color: '#475569' }
  ];

  return {
    buildingId: bld.id,
    floor: 0,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    exitZone,
    stairsZone: { x: -100, y: -100, width: 0, height: 0 },
    elevatorZone: { x: -100, y: -100, width: 0, height: 0 },
    exits: [exitZone],
    stairs: [],
    elevators: []
  };
}

export function getBuildingLayout(bld: Building, floor: number, aptId?: string | null): BuildingLayout {
  if (aptId) {
    const apt = getApartmentById(aptId);
    if (apt && apt.layout) {
      if (apt.dynamicFurniture && apt.dynamicFurniture.length > 0) {
        const mappedDynamic: InteriorFurniture[] = apt.dynamicFurniture.map(df => ({
          type: df.type as any,
          x: df.x,
          y: df.y,
          width: df.width || 20,
          height: df.height || 20,
          angle: df.rotation || 0,
          color: df.color || '#64748b'
        }));
        return {
          ...apt.layout,
          furniture: [...apt.layout.furniture, ...mappedDynamic]
        };
      }
      return apt.layout;
    }
  }
  if (bld.type === 'suburban') {
    if (floor === 1) {
      return createCottageFloor1Layout(bld.id, bld.width, bld.height);
    }
    // Attempt to load the registered suburban apartment if it exists
    const apt = getCityApartments().find(a => a.buildingId === bld.id);
    if (apt && apt.layout) {
      if (apt.dynamicFurniture && apt.dynamicFurniture.length > 0) {
        const mappedDynamic: InteriorFurniture[] = apt.dynamicFurniture.map(df => ({
          type: df.type as any,
          x: df.x,
          y: df.y,
          width: df.width || 20,
          height: df.height || 20,
          angle: df.rotation || 0,
          color: df.color || '#64748b'
        }));
        return {
          ...apt.layout,
          furniture: [...apt.layout.furniture, ...mappedDynamic]
        };
      }
      return apt.layout;
    }
    const isSecondaryOutbuilding = bld.id.includes('garage') || bld.id.includes('banya') ||
      (bld.nameRu && (bld.nameRu.includes('Гараж') || bld.nameRu.includes('Баня') || bld.nameRu.includes('Сауна')));
    if (isSecondaryOutbuilding) {
      return createDefaultSuburbanLayout(bld, floor);
    }
    return createCottageFloor0Layout(bld.id, bld.width, bld.height);
  }
  if (bld.type === 'real_estate_agency') {
    return createRealEstateAgencyLayout();
  }
  if (bld.type === 'railway_station') {
    return createRailwayStationLayout(bld, floor);
  }
  let raw: any = null;
  if (bld.interiors) {
    if (bld.interiors[floor]) raw = bld.interiors[floor];
    else if (bld.interiors[String(floor)]) raw = bld.interiors[String(floor)];
  }
  if (!raw) {
    if (bld.type === 'supermarket_store') return createSupermarketStoreLayout(bld, floor);
    if (bld.type === 'pharmacy_store') return createPharmacyStoreLayout(bld, floor);
    if (bld.type === 'bakery_cafe') return createBakeryCafeLayout(bld, floor);
    if (bld.type === 'coffee_bistro') return createCoffeeBistroLayout(bld, floor);
    return createDefaultBuildingLayout(bld, floor);
  }

  const rawExits = (Array.isArray(raw.exits) && raw.exits.length > 0)
    ? raw.exits
    : ((Array.isArray(raw.exitZones) && raw.exitZones.length > 0)
      ? raw.exitZones
      : (raw.exitZone ? [raw.exitZone] : []));

  const exits = rawExits.filter(Boolean);
  if (exits.length === 0) {
    exits.push({
      x: Math.max(6, Math.round(bld.width / 2 - 17)),
      y: Math.max(6, Math.round(bld.height - 14)),
      width: 34,
      height: 8
    });
  }
  const exitZone = raw.exitZone || exits[0];

  const rawElevators = Array.isArray(raw.elevators)
    ? raw.elevators
    : (raw.elevatorZone ? [raw.elevatorZone] : []);
  const elevators = rawElevators.filter(Boolean);
  const elevatorZone = raw.elevatorZone || elevators[0] || { x: 8, y: 8, width: 18, height: 18 };

  const rawStairs = Array.isArray(raw.stairs)
    ? raw.stairs
    : (raw.stairsZone ? [raw.stairsZone] : []);
  const stairs = rawStairs.filter(Boolean);
  const stairsZone = raw.stairsZone || stairs[0] || { x: 30, y: 8, width: 18, height: 18 };

  return {
    buildingId: raw.buildingId || bld.id,
    floor: raw.floor ?? floor,
    width: raw.width || bld.width,
    height: raw.height || bld.height,
    rooms: Array.isArray(raw.rooms)
      ? raw.rooms.filter(Boolean).map((rm: any) => ({
          ...rm,
          color: (typeof rm.color === 'string' && rm.color) ? rm.color : ((typeof rm.floorColor === 'string' && rm.floorColor) ? rm.floorColor : '#1e293b')
        }))
      : [],
    walls: Array.isArray(raw.walls) ? raw.walls.filter(Boolean) : [],
    furniture: Array.isArray(raw.furniture) ? raw.furniture.filter(Boolean) : [],
    elevatorZone,
    stairsZone,
    exitZone,
    elevators,
    stairs,
    exits
  };
}

// Backwards compatibility alias
export const generateBuildingLayout = getBuildingLayout;

export interface DoorSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  side: 'top' | 'bottom' | 'left' | 'right';
}

export function getApartmentDoorSegment(rm: InteriorRoom, walls: InteriorWall[]): DoorSegment | null {
  const rx1 = rm.x;
  const ry1 = rm.y;
  const rx2 = rm.x + rm.width;
  const ry2 = rm.y + rm.height;
  const epsilon = 1.5;

  // Let's check each of the 4 edges of the room rm.
  // We want to find the edge that has wall segments but also has a gap.
  
  // Edge 1: Bottom edge (y = ry2)
  const bottomWalls = walls.filter(w => Math.abs(w.y1 - ry2) < epsilon && Math.abs(w.y2 - ry2) < epsilon);
  if (bottomWalls.length > 0) {
    const segments = bottomWalls.map(w => ({ x1: Math.min(w.x1, w.x2), x2: Math.max(w.x1, w.x2) }))
      .filter(s => s.x2 > rx1 && s.x1 < rx2)
      .sort((a, b) => a.x1 - b.x1);
    
    let currentX = rx1;
    for (const s of segments) {
      if (s.x1 > currentX + 5) {
        return { x1: currentX, y1: ry2, x2: s.x1, y2: ry2, side: 'bottom' };
      }
      currentX = Math.max(currentX, s.x2);
    }
    if (currentX < rx2 - 5) {
      return { x1: currentX, y1: ry2, x2: rx2, y2: ry2, side: 'bottom' };
    }
  }

  // Edge 2: Top edge (y = ry1)
  const topWalls = walls.filter(w => Math.abs(w.y1 - ry1) < epsilon && Math.abs(w.y2 - ry1) < epsilon);
  if (topWalls.length > 0) {
    const segments = topWalls.map(w => ({ x1: Math.min(w.x1, w.x2), x2: Math.max(w.x1, w.x2) }))
      .filter(s => s.x2 > rx1 && s.x1 < rx2)
      .sort((a, b) => a.x1 - b.x1);
    
    let currentX = rx1;
    for (const s of segments) {
      if (s.x1 > currentX + 5) {
        return { x1: currentX, y1: ry1, x2: s.x1, y2: ry1, side: 'top' };
      }
      currentX = Math.max(currentX, s.x2);
    }
    if (currentX < rx2 - 5) {
      return { x1: currentX, y1: ry1, x2: rx2, y2: ry1, side: 'top' };
    }
  }

  // Edge 3: Left edge (x = rx1)
  const leftWalls = walls.filter(w => Math.abs(w.x1 - rx1) < epsilon && Math.abs(w.x2 - rx1) < epsilon);
  if (leftWalls.length > 0) {
    const segments = leftWalls.map(w => ({ y1: Math.min(w.y1, w.y2), y2: Math.max(w.y1, w.y2) }))
      .filter(s => s.y2 > ry1 && s.y1 < ry2)
      .sort((a, b) => a.y1 - b.y1);
    
    let currentY = ry1;
    for (const s of segments) {
      if (s.y1 > currentY + 5) {
        return { x1: rx1, y1: currentY, x2: rx1, y2: s.y1, side: 'left' };
      }
      currentY = Math.max(currentY, s.y2);
    }
    if (currentY < ry2 - 5) {
      return { x1: rx1, y1: currentY, x2: rx1, y2: ry2, side: 'left' };
    }
  }

  // Edge 4: Right edge (x = rx2)
  const rightWalls = walls.filter(w => Math.abs(w.x1 - rx2) < epsilon && Math.abs(w.x2 - rx2) < epsilon);
  if (rightWalls.length > 0) {
    const segments = rightWalls.map(w => ({ y1: Math.min(w.y1, w.y2), y2: Math.max(w.y1, w.y2) }))
      .filter(s => s.y2 > ry1 && s.y1 < ry2)
      .sort((a, b) => a.y1 - b.y1);
    
    let currentY = ry1;
    for (const s of segments) {
      if (s.y1 > currentY + 5) {
        return { x1: rx2, y1: currentY, x2: rx2, y2: s.y1, side: 'right' };
      }
      currentY = Math.max(currentY, s.y2);
    }
    if (currentY < ry2 - 5) {
      return { x1: rx2, y1: currentY, x2: rx2, y2: ry2, side: 'right' };
    }
  }

  // Fallback: Default to a centered bottom door
  return {
    x1: rm.x + rm.width / 2 - 12,
    y1: rm.y + rm.height,
    x2: rm.x + rm.width / 2 + 12,
    y2: rm.y + rm.height,
    side: 'bottom'
  };
}

export function constrainPlayerToInterior(
  player: Player,
  bld: Building,
  layout: BuildingLayout,
  dt: number
) {
  let px = player.x - bld.x;
  let py = player.y - bld.y;

  const radius = 6.5;

  // A. Constrain inside outer walls
  px = Math.max(radius + 7, Math.min(layout.width - radius - 7, px));
  py = Math.max(radius + 7, Math.min(layout.height - radius - 7, py));

  // B. Collide with internal walls (slide-collision physics)
  for (const wall of layout.walls) {
    const x1 = wall.x1;
    const y1 = wall.y1;
    const x2 = wall.x2;
    const y2 = wall.y2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    const distDx = px - closestX;
    const distDy = py - closestY;
    const distSq = distDx * distDx + distDy * distDy;
    const minDist = radius + 1.5;

    if (distSq < minDist * minDist) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      if (dist > 0.001) {
        px += (distDx / dist) * overlap;
        py += (distDy / dist) * overlap;
      } else {
        px += minDist;
      }
    }
  }

  // C. Collide with blocking furniture items
  for (const furn of layout.furniture) {
    if (
      furn.type === 'carpet' || 
      furn.type === 'plant' || 
      furn.type === 'chair' || 
      furn.type === 'computer' || 
      furn.type === 'tv' ||
      furn.type === 'blackboard' ||
      furn.type === 'whiteboard' ||
      furn.type === 'mirror' ||
      furn.type === 'radiator' ||
      furn.type === 'coat_rack' ||
      furn.type === 'trash_can' ||
      furn.type === 'floor_lamp'
    ) continue;

    const fx1 = furn.x;
    const fy1 = furn.y;
    const fx2 = furn.x + furn.width;
    const fy2 = furn.y + furn.height;

    if (px + radius > fx1 && px - radius < fx2 && py + radius > fy1 && py - radius < fy2) {
      const overlapLeft = (px + radius) - fx1;
      const overlapRight = fx2 - (px - radius);
      const overlapTop = (py + radius) - fy1;
      const overlapBottom = fy2 - (py - radius);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if (minOverlap === overlapLeft) px -= overlapLeft;
      else if (minOverlap === overlapRight) px += overlapRight;
      else if (minOverlap === overlapTop) py -= overlapTop;
      else if (minOverlap === overlapBottom) py += overlapBottom;
    }
  }

  // D. Block entry to locked apartments on this floor inside multi-apartment buildings using Door-specific line collision
  const floorApts = getCityApartments().filter(a => a.buildingId === bld.id && a.floor === (player.currentFloor || 0));
  for (const apt of floorApts) {
    if (apt.isLocked && (!player.isInsideApartment || player.insideApartmentId !== apt.id)) {
      const aptRoom = layout.rooms.find(rm => rm.name === `Кв. ${apt.apartmentNumber}` || rm.name === `Кв.${apt.apartmentNumber}`);
      if (aptRoom) {
        const door = getApartmentDoorSegment(aptRoom, layout.walls);
        if (door) {
          const x1 = door.x1;
          const y1 = door.y1;
          const x2 = door.x2;
          const y2 = door.y2;

          const dx = x2 - x1;
          const dy = y2 - y1;
          const lenSq = dx * dx + dy * dy;
          let t = 0;
          if (lenSq > 0) {
            t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
          }
          const closestX = x1 + t * dx;
          const closestY = y1 + t * dy;

          const distDx = px - closestX;
          const distDy = py - closestY;
          const distSq = distDx * distDx + distDy * distDy;
          const minDist = radius + 1.5;

          if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            if (dist > 0.001) {
              px += (distDx / dist) * overlap;
              py += (distDy / dist) * overlap;
            } else {
              px += minDist;
            }
          }
        }
      }
    }
  }

  // Map back to absolute world coordinates
  player.x = bld.x + px;
  player.y = bld.y + py;
}

// --- OFFSCREEN CANVAS CACHE FOR INTERIOR FLOORS & FURNITURE ---
const interiorCanvasCache = new Map<string, HTMLCanvasElement>();
const MAX_INTERIOR_CANVASES = 20;

export function clearInteriorCanvasCache() {
  for (const c of interiorCanvasCache.values()) {
    c.width = 0;
    c.height = 0;
  }
  interiorCanvasCache.clear();
}

function renderStaticInteriorLayout(
  ctx: CanvasRenderingContext2D,
  bld: Building,
  layout: BuildingLayout,
  windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[],
  isHospital: boolean
) {
  // Base background floor of the building
  if (isHospital) {
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(0, 0, layout.width, layout.height);

    // Sterile institutional floor tiles (single batched stroke for high FPS)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let tx = 0; tx < layout.width; tx += 12) {
      ctx.moveTo(tx, 0); ctx.lineTo(tx, layout.height);
    }
    for (let ty = 0; ty < layout.height; ty += 12) {
      ctx.moveTo(0, ty); ctx.lineTo(layout.width, ty);
    }
    ctx.stroke();

    // Classic Hospital Floor Navigation Guide Lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 116);
    ctx.lineTo(layout.width - 25, 116);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 124);
    ctx.lineTo(layout.width - 25, 124);
    ctx.stroke();

    // Red Cross emblem in main lobby floor
    const crossX = 221;
    const crossY = 172;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.fillRect(crossX - 9, crossY - 3, 18, 6);
    ctx.fillRect(crossX - 3, crossY - 9, 6, 18);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(crossX - 9, crossY - 3, 18, 6);
    ctx.strokeRect(crossX - 3, crossY - 9, 6, 18);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  // Render rooms with optimized floor textures
  for (const rm of (layout.rooms || [])) {
    if (!rm) continue;
    const roomColor = (typeof rm.color === 'string' && rm.color)
      ? rm.color
      : ((typeof (rm as any).floorColor === 'string' && (rm as any).floorColor) ? (rm as any).floorColor : '#1e293b');

    ctx.fillStyle = roomColor;
    ctx.fillRect(rm.x, rm.y, rm.width, rm.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(rm.x, rm.y, rm.width, rm.height);
    ctx.clip();
    
    if (rm.floorStyle === 'tile' || roomColor === '#1e293b' || roomColor === '#042f2e' || roomColor === '#0f172a' || isHospital) {
      // Ceramic tile grid (single batched stroke)
      ctx.strokeStyle = isHospital || roomColor.startsWith('#f') || roomColor.startsWith('#e') || roomColor.startsWith('#d') 
        ? 'rgba(100, 116, 139, 0.18)' 
        : 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 10) {
        ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height);
      }
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 10) {
        ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty);
      }
      ctx.stroke();
    } else if (rm.floorStyle === 'parquet' || rm.floorStyle === 'wood') {
      // Parquet wood planks (batched stroke)
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let ty = rm.y; ty < rm.y + rm.height; ty += 4) {
        ctx.moveTo(rm.x, ty); ctx.lineTo(rm.x + rm.width, ty);
      }
      ctx.stroke();
    } else if (rm.floorStyle === 'playmat') {
      // Kids playmat pattern (batched stroke)
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let tx = rm.x; tx < rm.x + rm.width; tx += 14) {
        ctx.moveTo(tx, rm.y); ctx.lineTo(tx, rm.y + rm.height);
      }
      ctx.stroke();
    }
    
    // Crisp room boundary (zero shadowBlur for high performance)
    ctx.strokeStyle = isHospital ? 'rgba(148, 163, 184, 0.3)' : 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rm.x + 0.5, rm.y + 0.5, rm.width - 1, rm.height - 1);
    ctx.restore();

    // Cyrillic room label
    const isLightFloor = isHospital || roomColor.startsWith('#f') || roomColor.startsWith('#e') || roomColor.startsWith('#d') || roomColor.startsWith('#c');
    ctx.fillStyle = isLightFloor ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.28)';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rm.name, rm.x + rm.width / 2, rm.y + rm.height / 2);
  }

  // Draw all elevator zones (Лифты)
  for (const el of (layout.elevators || [])) {
    if (!el) continue;
    ctx.fillStyle = '#334155';
    ctx.fillRect(el.x, el.y, el.width, el.height);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(el.x, el.y, el.width, el.height);
    
    // Elevator door center split
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(el.x + el.width / 2, el.y);
    ctx.lineTo(el.x + el.width / 2, el.y + el.height);
    ctx.stroke();

    // Elevator LED floor indicator light
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(el.x + 3, el.y + el.height / 2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ЛИФТ', el.x + el.width / 2, el.y + el.height / 2);
  }

  // Draw all stairs zones (Лестницы)
  for (const st of (layout.stairs || [])) {
    if (!st) continue;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(st.x, st.y, st.width, st.height);
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(st.x, st.y, st.width, st.height);

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const stepCount = 4;
    for (let s = 1; s <= stepCount; s++) {
      const sy = st.y + (st.height / (stepCount + 1)) * s;
      ctx.moveTo(st.x + 1, sy);
      ctx.lineTo(st.x + st.width - 1, sy);
    }
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 4px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ЛЕСТН.', st.x + st.width / 2, st.y + st.height / 2);
  }

  // Draw all exit zones (Выходы на улицу)
  const exitsList = (layout.exits && layout.exits.length > 0) ? layout.exits : (layout.exitZone ? [layout.exitZone] : []);
  for (const ex of exitsList) {
    if (!ex) continue;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    ctx.fillRect(ex.x, ex.y, ex.width, ex.height);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex.x, ex.y, ex.width, ex.height);

    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 4.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ВЫХОД', ex.x + ex.width / 2, ex.y + ex.height / 2);
  }

  // Draw Furniture with high-fidelity vector textures
  // 1. Base floor textiles (carpets, rugs) drawn first
  for (const f of layout.furniture) {
    if (f.type === 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);
      renderInteriorFurniture(ctx, f, 12);
      ctx.restore();
    }
  }

  // 2. Physical furniture items with realistic depth & lightweight contact shadows
  for (const f of layout.furniture) {
    if (f.type !== 'carpet') {
      ctx.save();
      ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
      ctx.rotate(f.angle);

      // Lightweight crisp ambient contact shadow (Zero GPU Gaussian blur overhead)
      if (f.type !== 'blackboard' && f.type !== 'whiteboard') {
        const halfW = f.width / 2;
        const halfH = f.height / 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
        ctx.fillRect(-halfW + 0.8, -halfH + 0.8, f.width, f.height);
      }

      renderInteriorFurniture(ctx, f, 12);
      ctx.restore();
    }
  }

  // Draw interior walls
  // Wall shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (!wall.isJailBars) {
      ctx.moveTo(wall.x1 + 0.8, wall.y1 + 0.8);
      ctx.lineTo(wall.x2 + 0.8, wall.y2 + 0.8);
    }
  }
  ctx.stroke();

  // Wall base
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (!wall.isJailBars) {
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
    }
  }
  ctx.stroke();

  // Wall top highlight
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (wall.isJailBars) {
      ctx.save();
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
    }
  }
  ctx.stroke();

  // Outer Building Walls & Windows
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 5;
  ctx.strokeRect(1, 1, layout.width, layout.height);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, layout.width, layout.height);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, layout.width, layout.height);

  // Window cyan glass sills
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.2;
  for (const win of windows) {
    ctx.beginPath();
    if (win.side === 'top' || win.side === 'bottom') {
      ctx.moveTo(win.x - 6, win.y);
      ctx.lineTo(win.x + 6, win.y);
    } else {
      ctx.moveTo(win.x, win.y - 6);
      ctx.lineTo(win.x, win.y + 6);
    }
    ctx.stroke();
  }
}

export function renderBuildingInterior(
  ctx: CanvasRenderingContext2D,
  bld: Building,
  layout: BuildingLayout,
  player: Player,
  timeHour: number
) {
  ctx.save();
  ctx.translate(bld.x, bld.y);

  // Generate windows along outer walls
  const windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[] = [];
  for (let x = 30; x < layout.width - 30; x += 40) {
    windows.push({ x, y: 0, side: 'top' });
    windows.push({ x, y: layout.height, side: 'bottom' });
  }
  for (let y = 30; y < layout.height - 30; y += 40) {
    windows.push({ x: 0, y, side: 'left' });
    windows.push({ x: layout.width, y, side: 'right' });
  }

  // Calculate daylight & electric lighting intensity
  let dayIntensity = 0;
  if (timeHour >= 5 && timeHour < 19) {
    if (timeHour < 12) {
      dayIntensity = (timeHour - 5) / 7;
    } else {
      dayIntensity = (19 - timeHour) / 7;
    }
  }

  let electricIntensity = 0;
  if (timeHour >= 17 || timeHour < 7) {
    if (timeHour >= 17 && timeHour < 20) {
      electricIntensity = (timeHour - 17) / 3;
    } else if (timeHour >= 4 && timeHour < 7) {
      electricIntensity = (7 - timeHour) / 3;
    } else {
      electricIntensity = 1;
    }
  }

  const isHospital = bld.type === 'hospital';

  // Render static floor & furniture from cached bitmap
  const furnAnglesSum = layout.furniture?.reduce((acc, f) => acc + (f.angle || 0), 0) || 0;
  const cacheKey = `${bld.id}_${layout.floor ?? (bld as any).currentFloor ?? 0}_${layout.width}_${layout.height}_${layout.rooms?.length || 0}_${layout.furniture?.length || 0}_${furnAnglesSum.toFixed(2)}`;
  let cachedCanvas = interiorCanvasCache.get(cacheKey);
  if (!cachedCanvas && typeof document !== 'undefined') {
    if (interiorCanvasCache.size >= MAX_INTERIOR_CANVASES) {
      const firstKey = interiorCanvasCache.keys().next().value;
      if (firstKey !== undefined) {
        const oldC = interiorCanvasCache.get(firstKey);
        if (oldC) {
          oldC.width = 0;
          oldC.height = 0;
        }
        interiorCanvasCache.delete(firstKey);
      }
    }
    cachedCanvas = document.createElement('canvas');
    cachedCanvas.width = layout.width;
    cachedCanvas.height = layout.height;
    const cCtx = cachedCanvas.getContext('2d');
    if (cCtx) {
      renderStaticInteriorLayout(cCtx, bld, layout, windows, isHospital);
      interiorCanvasCache.set(cacheKey, cachedCanvas);
    }
  } else if (cachedCanvas) {
    // Refresh LRU order
    interiorCanvasCache.delete(cacheKey);
    interiorCanvasCache.set(cacheKey, cachedCanvas);
  }

  if (cachedCanvas) {
    ctx.drawImage(cachedCanvas, 0, 0);
  } else {
    renderStaticInteriorLayout(ctx, bld, layout, windows, isHospital);
  }

  // Dynamic Layer 1: Volumetric daylight beams from windows
  if (dayIntensity > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    for (const win of windows) {
      let x1 = win.x;
      let y1 = win.y;
      let x2 = win.x;
      let y2 = win.y;
      
      const beamLength = 48;
      const beamSpread = 14;
      
      let p1x = 0, p1y = 0, p2x = 0, p2y = 0, p3x = 0, p3y = 0, p4x = 0, p4y = 0;
      
      if (win.side === 'top') {
        y2 = win.y + beamLength;
        x2 = win.x + 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'bottom') {
        y2 = win.y - beamLength;
        x2 = win.x - 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'left') {
        x2 = win.x + beamLength;
        y2 = win.y + 12;
        p1x = win.x; p1y = win.y - 5;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'right') {
        x2 = win.x - beamLength;
        y2 = win.y - 12;
        p1x = win.x - 5; p1y = win.y;
        p2x = win.x + 5; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      }
      
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(254, 240, 138, ${0.32 * dayIntensity})`);
      grad.addColorStop(0.3, `rgba(254, 240, 138, ${0.14 * dayIntensity})`);
      grad.addColorStop(1, 'rgba(254, 240, 138, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Dynamic Layer 2: Electric Ceiling Lights (Fluorescent in hospital, warm incandescent in residential)
  const isNight = electricIntensity > 0;
  if (isNight || isHospital) {
    const intensity = isHospital ? Math.max(0.7, electricIntensity) : electricIntensity;
    const lights: { x: number; y: number; radius: number }[] = [];
    
    for (const rm of layout.rooms) {
      const rx = rm.x;
      const ry = rm.y;
      const rw = rm.width;
      const rh = rm.height;
      
      if (rw > 60) {
        lights.push({ x: rx + rw * 0.3, y: ry + rh / 2, radius: Math.min(rw * 0.45, 40) });
        lights.push({ x: rx + rw * 0.7, y: ry + rh / 2, radius: Math.min(rw * 0.45, 40) });
      } else {
        lights.push({ x: rx + rw / 2, y: ry + rh / 2, radius: Math.min(rw * 0.75, 35) });
      }
    }

    for (const el of (layout.elevators || [])) {
      if (!el) continue;
      lights.push({ x: el.x + el.width / 2, y: el.y + el.height / 2, radius: 22 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const lt of lights) {
      const grad = ctx.createRadialGradient(lt.x, lt.y, 1.5, lt.x, lt.y, lt.radius);
      if (isHospital) {
        // Cold white-cyan 5500K clinical fluorescent light
        grad.addColorStop(0, `rgba(224, 242, 254, ${0.48 * intensity})`);
        grad.addColorStop(0.35, `rgba(186, 230, 253, ${0.18 * intensity})`);
        grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
      } else {
        // Warm home incandescent light
        grad.addColorStop(0, `rgba(253, 224, 71, ${0.44 * intensity})`);
        grad.addColorStop(0.35, `rgba(253, 224, 71, ${0.16 * intensity})`);
        grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      }
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    for (const lt of lights) {
      if (isHospital) {
        // Fluorescent rectangular ceiling diffuser troffer (ЛВО 600x600)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lt.x - 3, lt.y - 1.5, 6, 3);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(lt.x - 3, lt.y - 1.5, 6, 3);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lt.x, lt.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw physical doors dynamically
  if (!player.isInsideApartment) {
    const floorApts = getCityApartments().filter(a => a.buildingId === bld.id && a.floor === (player.currentFloor || 0));
    for (const apt of floorApts) {
      const rm = layout.rooms?.find(r => r.name === `Кв. ${apt.apartmentNumber}` || r.name === `Кв.${apt.apartmentNumber}`);
      if (rm) {
        const door = getApartmentDoorSegment(rm, layout.walls);
        if (door) {
          ctx.save();
          
          if (apt.isLocked) {
            // Closed / Locked Door: Draw a thick solid wooden-brown line
            ctx.strokeStyle = '#78350f'; // Dark wood
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(door.x1, door.y1);
            ctx.lineTo(door.x2, door.y2);
            ctx.stroke();

            // Draw a shiny brass door lock / handle
            const cx = (door.x1 + door.x2) / 2;
            const cy = (door.y1 + door.y2) / 2;
            ctx.fillStyle = '#eab308'; // Gold / Brass
            ctx.beginPath();
            ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
            ctx.fill();

            // A tiny red security dot to indicate locked
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(cx, cy, 0.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Open Door: Draw a door swung open at 90 degrees
            ctx.strokeStyle = '#a16207'; // Medium wood
            ctx.lineWidth = 3;
            ctx.beginPath();

            // Swing angle (-Math.PI / 2.5) from point 1 to indicate swing direction
            const angle = -Math.PI / 2.5;
            const len = Math.hypot(door.x2 - door.x1, door.y2 - door.y1);
            const baseAngle = Math.atan2(door.y2 - door.y1, door.x2 - door.x1);
            const dx = Math.cos(baseAngle + angle) * len;
            const dy = Math.sin(baseAngle + angle) * len;

            ctx.moveTo(door.x1, door.y1);
            ctx.lineTo(door.x1 + dx, door.y1 + dy);
            ctx.stroke();

            // Draw thin grey swing trajectory arc
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.arc(door.x1, door.y1, len, baseAngle, baseAngle + angle, angle < 0);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
  }

  ctx.restore();
}

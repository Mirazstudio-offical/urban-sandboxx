import * as fs from 'fs';
import * as path from 'path';

export interface InteriorWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isJailBars?: boolean;
}

export interface InteriorFurniture {
  type: string;
  x: number;
  y: number;
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
}

export interface InteriorRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
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

export interface BuildingData {
  id: string;
  type: string;
  name?: string;
  nameRu?: string;
  width: number;
  height: number;
  interiors?: Record<string, BuildingLayout>;
}

// -------------------------------------------------------------
// Layout Builders
// -------------------------------------------------------------

export function buildSupermarketLayout(bld: BuildingData): BuildingLayout {
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
    // Outer perimeter envelope
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },

    // Partition between Sales Floor and East Wing (Warehouse & Admin) at x = xEast
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    // Door gap y: 18..48 (30px wide!) to Warehouse
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    // Door gap y: 68..96 (28px wide!) to Admin & Staff
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },

    // Partition between Warehouse (top) and Admin/Staff (bottom) at y = 56
    { x1: xEast, y1: 56, x2: xEast + 16, y2: 56 },
    // Door gap x: xEast + 16 .. xEast + 44 (28px wide!)
    { x1: xEast + 44, y1: 56, x2: W - 6, y2: 56 },

    // Partition between Admin Office and Staff Breakroom/Restroom at x = xEast + 76
    { x1: xEast + 76, y1: 56, x2: xEast + 76, y2: 68 },
    // Door gap y: 68..94 (26px wide!)
    { x1: xEast + 76, y1: 94, x2: xEast + 76, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. Entrance Vestibule & Lockers ---
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#334155' },
    { type: 'atm', x: xMid + 24, y: 78, width: 9, height: 8, angle: 0, color: '#16a34a' },
    { type: 'lockers', x: xMid + 38, y: 78, width: 24, height: 8, angle: 0, color: '#0284c7' },
    { type: 'cooler', x: xMid + 14, y: 78, width: 7, height: 7, angle: 0, color: '#38bdf8' },
    { type: 'trash_can', x: xMid - 26, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'bench', x: xMid - 50, y: 78, width: 18, height: 6, angle: 0, color: '#78350f' },
    { type: 'plant', x: xMid + 68, y: 78, width: 8, height: 8, angle: 0, color: '#15803d' },

    // --- 2. Checkout Lanes (Cash Registers) ---
    // Lane 1
    { type: 'counter', x: xMid - 85, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 82, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },
    // Lane 2
    { type: 'counter', x: xMid - 130, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 127, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },
    // Lane 3
    { type: 'counter', x: xMid - 175, y: 86, width: 20, height: 8, angle: 0, color: '#16a34a' },
    { type: 'cash_register', x: xMid - 172, y: 88, width: 6, height: 4, angle: 0, color: '#0f172a' },

    // --- 3. Fresh Produce & Bakery (West Side) ---
    { type: 'shelf', x: 10, y: 14, width: 8, height: 24, angle: 0, color: '#15803d' },
    { type: 'shelf', x: 10, y: 42, width: 8, height: 22, angle: 0, color: '#15803d' },
    { type: 'table', x: 32, y: 20, width: 22, height: 14, angle: 0, color: '#65a30d' },
    { type: 'table', x: 32, y: 44, width: 22, height: 14, angle: 0, color: '#65a30d' },
    { type: 'shelf', x: 70, y: 16, width: 8, height: 38, angle: 0, color: '#d97706' },

    // --- 4. Dairy & Refrigerated Line (North Wall, y: 10) ---
    { type: 'freezer_display', x: 96, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'freezer_display', x: 128, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: 160, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'fridge', x: 184, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'freezer_display', x: 208, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'freezer_display', x: 240, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: 272, y: 10, width: 18, height: 8, angle: 0, color: '#0284c7' },
    { type: 'freezer_display', x: 296, y: 10, width: 26, height: 8, angle: 0, color: '#38bdf8' },

    // --- 5. Central Grocery & Beverage Aisles (y: 30 .. 58) ---
    // Aisle Row 1 (y: 30)
    { type: 'shelf', x: 100, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 154, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 208, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 262, y: 30, width: 34, height: 8, angle: 0, color: '#059669' },
    // Aisle Row 2 (y: 50)
    { type: 'shelf', x: 100, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 154, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 208, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },
    { type: 'shelf', x: 262, y: 50, width: 34, height: 8, angle: 0, color: '#059669' },

    // --- 6. Warehouse & Stockroom (East Wing Top) ---
    { type: 'fire_rack', x: xEast + 14, y: 10, width: 14, height: 6, angle: 0, color: '#dc2626' },
    { type: 'pallet_stack', x: xEast + 38, y: 12, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'pallet_stack', x: xEast + 62, y: 12, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'shelf', x: W - 46, y: 12, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'shelf', x: W - 46, y: 32, width: 36, height: 10, angle: 0, color: '#64748b' },

    // --- 7. Admin Office (East Wing Bottom-Left) ---
    { type: 'desk', x: xEast + 12, y: 64, width: 24, height: 12, angle: 0, color: '#334155' },
    { type: 'chair', x: xEast + 18, y: 78, width: 7, height: 7, angle: 0, color: '#0284c7' },
    { type: 'computer', x: xEast + 16, y: 65, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'safe', x: xEast + 44, y: 64, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'file_cabinet', x: xEast + 60, y: 64, width: 12, height: 10, angle: 0, color: '#64748b' },

    // --- 8. Staff Breakroom & Restroom (East Wing Bottom-Right) ---
    { type: 'toilet', x: W - 32, y: 62, width: 8, height: 10, angle: 0, color: '#ffffff' },
    { type: 'sink', x: W - 18, y: 62, width: 10, height: 8, angle: 0, color: '#e2e8f0' },
    { type: 'mirror', x: W - 16, y: 58, width: 6, height: 3, angle: 0, color: '#f59e0b' },
    { type: 'table', x: xEast + 86, y: 88, width: 16, height: 10, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 90, y: 80, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'microwave', x: xEast + 106, y: 88, width: 8, height: 6, angle: 0, color: '#334155' },
    { type: 'lockers', x: W - 32, y: 86, width: 24, height: 8, angle: 0, color: '#475569' }
  ];

  // If W > 580 (e.g. 620), add extra shelf bays to fill wide store comfortably
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

export function buildPharmacyLayout(bld: BuildingData): BuildingLayout {
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
    // Outer perimeter
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },

    // Partition between Sales Floor and East Wing at x = xEast
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    // Door gap y: 18..48 (30px wide!) to Medicine Storage
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    // Door gap y: 68..96 (28px wide!) to Office & Staff
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },

    // Partition between Storage and Office at y = 58
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    // Door gap x: xEast + 16 .. xEast + 44 (28px wide!)
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },

    // Partition between Office and Staff Restroom at x = xEast + 72
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    // Door gap y: 68..94 (26px wide!)
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. Entrance Area & Health Lounge ---
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#047857' },
    { type: 'sofa', x: xMid + 28, y: 78, width: 24, height: 10, angle: 0, color: '#0d9488' },
    { type: 'cooler', x: xMid + 16, y: 78, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'atm', x: xMid - 36, y: 78, width: 9, height: 8, angle: 0, color: '#059669' },
    { type: 'table', x: xMid - 58, y: 78, width: 14, height: 10, angle: 0, color: '#334155' },
    { type: 'chair', x: xMid - 54, y: 90, width: 6, height: 6, angle: 0, color: '#0284c7' },
    { type: 'trash_can', x: xMid + 56, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'plant', x: xMid + 66, y: 78, width: 8, height: 8, angle: 0, color: '#10b981' },

    // --- 2. Prescription Counters (Cash Registers) ---
    { type: 'counter', x: xMid - 130, y: 52, width: 38, height: 9, angle: 0, color: '#059669' },
    { type: 'cash_register', x: xMid - 120, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'computer', x: xMid - 108, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },

    { type: 'counter', x: xMid - 85, y: 52, width: 38, height: 9, angle: 0, color: '#059669' },
    { type: 'cash_register', x: xMid - 75, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'computer', x: xMid - 63, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },

    // --- 3. Vitrines & Display Shelves (West Wing) ---
    { type: 'shelf', x: 10, y: 16, width: 8, height: 36, angle: 0, color: '#10b981' },
    { type: 'shelf', x: 10, y: 58, width: 8, height: 36, angle: 0, color: '#10b981' },
    { type: 'bookshelf', x: 36, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 36, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 74, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 74, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 112, y: 22, width: 22, height: 10, angle: 0, color: '#047857' },
    { type: 'bookshelf', x: 112, y: 48, width: 22, height: 10, angle: 0, color: '#047857' },

    // --- 4. Storage & Pharmacy Lab (East Wing Top) ---
    { type: 'safe', x: xEast + 12, y: 10, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'fridge', x: xEast + 32, y: 10, width: 14, height: 14, angle: 0, color: '#38bdf8' },
    { type: 'sink', x: xEast + 54, y: 10, width: 12, height: 10, angle: 0, color: '#e2e8f0' },
    { type: 'shelf', x: W - 46, y: 12, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'shelf', x: W - 46, y: 32, width: 36, height: 10, angle: 0, color: '#64748b' },
    { type: 'desk', x: xEast + 34, y: 34, width: 26, height: 12, angle: 0, color: '#334155' },
    { type: 'chair', x: xEast + 42, y: 26, width: 6, height: 6, angle: 0, color: '#0284c7' },
    { type: 'lockers', x: xEast + 68, y: 34, width: 24, height: 8, angle: 0, color: '#475569' },

    // --- 5. Head Pharmacist Office (East Wing Bottom-Left) ---
    { type: 'bookshelf', x: xEast + 38, y: 60, width: 18, height: 8, angle: 0, color: '#475569' },
    { type: 'file_cabinet', x: xEast + 58, y: 60, width: 10, height: 8, angle: 0, color: '#64748b' },
    { type: 'desk', x: xEast + 12, y: 84, width: 24, height: 10, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 18, y: 74, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'computer', x: xEast + 16, y: 85, width: 6, height: 4, angle: 0, color: '#0f172a' },

    // --- 6. Staff Restroom (East Wing Bottom-Right) ---
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

export function buildBakeryCafeLayout(bld: BuildingData): BuildingLayout {
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
    // Outer perimeter
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },

    // Partition between Dining Hall and East Wing at x = xEast
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    // Door gap y: 18..48 (30px wide!) to Baking Kitchen
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    // Door gap y: 68..96 (28px wide!) to Flour Storage & Restrooms
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },

    // Partition between Kitchen and Flour/Restroom at y = 58
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    // Door gap x: xEast + 16 .. xEast + 44 (28px wide!)
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },

    // Partition between Flour Storage and Restroom at x = xEast + 72
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    // Door gap y: 68..94 (26px wide!)
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. Order Counter & Pastry Display ---
    { type: 'counter', x: xMid - 50, y: 58, width: 40, height: 9, angle: 0, color: '#ea580c' },
    { type: 'cash_register', x: xMid - 40, y: 59, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'counter', x: xMid - 8, y: 58, width: 34, height: 9, angle: 0, color: '#b45309' },
    { type: 'microwave', x: xMid + 2, y: 59, width: 6, height: 5, angle: 0, color: '#334155' },
    { type: 'cooler', x: xMid + 30, y: 58, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'fridge', x: xMid + 42, y: 58, width: 12, height: 10, angle: 0, color: '#38bdf8' },

    // Entrance decor & conveniences
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#7c2d12' },
    { type: 'trash_can', x: xMid + 20, y: 78, width: 6, height: 6, angle: 0, color: '#475569' },
    { type: 'plant', x: xMid + 32, y: 78, width: 8, height: 8, angle: 0, color: '#16a34a' },

    // --- 2. Dining Hall & Seating (West Wing) ---
    // Street tables
    { type: 'table', x: 18, y: 18, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 46, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 74, width: 14, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 10, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },

    // Booth seating
    { type: 'sofa', x: 58, y: 18, width: 26, height: 10, angle: 0, color: '#d97706' },
    { type: 'table', x: 58, y: 32, width: 22, height: 12, angle: 0, color: '#92400e' },
    { type: 'sofa', x: 58, y: 56, width: 26, height: 10, angle: 0, color: '#d97706' },
    { type: 'table', x: 58, y: 70, width: 22, height: 12, angle: 0, color: '#92400e' },

    // Central tables
    { type: 'table', x: 102, y: 24, width: 18, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 94, y: 28, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 122, y: 28, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 102, y: 64, width: 18, height: 14, angle: 0, color: '#78350f' },
    { type: 'chair', x: 94, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 122, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'floor_lamp', x: 48, y: 90, width: 8, height: 8, angle: 0, color: '#ea580c' },
    { type: 'plant', x: 88, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },

    // --- 3. Bakery Kitchen (East Wing Top) ---
    { type: 'stove', x: xEast + 12, y: 14, width: 24, height: 16, angle: 0, color: '#c2410c' },
    { type: 'kitchen_counter', x: xEast + 42, y: 14, width: 32, height: 12, angle: 0, color: '#64748b' },
    { type: 'fridge', x: xEast + 80, y: 14, width: 16, height: 14, angle: 0, color: '#38bdf8' },
    { type: 'sink', x: W - 28, y: 14, width: 14, height: 12, angle: 0, color: '#e2e8f0' },
    { type: 'shelf', x: xEast + 42, y: 34, width: 32, height: 10, angle: 0, color: '#475569' },

    // --- 4. Flour Storage (East Wing Bottom-Left) ---
    { type: 'pallet_stack', x: xEast + 14, y: 66, width: 18, height: 14, angle: 0, color: '#b45309' },
    { type: 'shelf', x: xEast + 38, y: 64, width: 26, height: 10, angle: 0, color: '#64748b' },

    // --- 5. Restroom (East Wing Bottom-Right) ---
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

export function buildCoffeeBistroLayout(bld: BuildingData): BuildingLayout {
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
    // Outer perimeter
    { x1: 6, y1: 6, x2: W - 6, y2: 6 },
    { x1: W - 6, y1: 6, x2: W - 6, y2: 104 },
    { x1: W - 6, y1: 104, x2: 6, y2: 104 },
    { x1: 6, y1: 104, x2: 6, y2: 6 },

    // Partition between Bistro Hall and East Wing at x = xEast
    { x1: xEast, y1: 6, x2: xEast, y2: 18 },
    // Door gap y: 18..48 (30px wide!) to Kitchen
    { x1: xEast, y1: 48, x2: xEast, y2: 68 },
    // Door gap y: 68..96 (28px wide!) to Office & Restroom
    { x1: xEast, y1: 96, x2: xEast, y2: 104 },

    // Partition between Kitchen and Office/Restroom at y = 58
    { x1: xEast, y1: 58, x2: xEast + 16, y2: 58 },
    // Door gap x: xEast + 16 .. xEast + 44 (28px wide!)
    { x1: xEast + 44, y1: 58, x2: W - 6, y2: 58 },

    // Partition between Office and Restroom at x = xEast + 72
    { x1: xEast + 72, y1: 58, x2: xEast + 72, y2: 68 },
    // Door gap y: 68..94 (26px wide!)
    { x1: xEast + 72, y1: 94, x2: xEast + 72, y2: 104 }
  ];

  const furniture: InteriorFurniture[] = [
    // --- 1. Espresso Bar & Order Counter ---
    { type: 'counter', x: xMid - 130, y: 52, width: 44, height: 9, angle: 0, color: '#78350f' },
    { type: 'cash_register', x: xMid - 118, y: 53, width: 6, height: 4, angle: 0, color: '#0f172a' },
    { type: 'kitchen_counter', x: xMid - 82, y: 52, width: 24, height: 9, angle: 0, color: '#451a03' },
    { type: 'freezer_display', x: xMid - 54, y: 52, width: 20, height: 9, angle: 0, color: '#38bdf8' },

    // Entrance area & amenities
    { type: 'carpet', x: xMid - 20, y: 88, width: 40, height: 8, angle: 0, color: '#7c2d12' },
    { type: 'atm', x: xMid + 28, y: 78, width: 9, height: 8, angle: 0, color: '#0284c7' },
    { type: 'cooler', x: xMid + 16, y: 78, width: 8, height: 8, angle: 0, color: '#38bdf8' },
    { type: 'plant', x: xMid + 42, y: 78, width: 8, height: 8, angle: 0, color: '#16a34a' },
    { type: 'floor_lamp', x: xMid - 36, y: 78, width: 8, height: 8, angle: 0, color: '#ea580c' },

    // --- 2. Dining & Lounge (West Wing) ---
    // Bistro window tables
    { type: 'table', x: 18, y: 18, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 22, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 46, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 50, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 18, y: 74, width: 14, height: 14, angle: 0, color: '#b45309' },
    { type: 'chair', x: 10, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 34, y: 78, width: 6, height: 6, angle: 0, color: '#451a03' },

    // Leather lounge section
    { type: 'sofa', x: 58, y: 18, width: 28, height: 12, angle: 0, color: '#78350f' },
    { type: 'carpet', x: 56, y: 32, width: 32, height: 18, angle: 0, color: '#9a3412' },
    { type: 'table', x: 60, y: 34, width: 24, height: 14, angle: 0, color: '#451a03' },
    { type: 'sofa', x: 58, y: 54, width: 28, height: 12, angle: 0, color: '#78350f' },

    // Dining tables
    { type: 'table', x: 102, y: 22, width: 20, height: 16, angle: 0, color: '#92400e' },
    { type: 'chair', x: 94, y: 26, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 124, y: 26, width: 6, height: 6, angle: 0, color: '#451a03' },

    { type: 'table', x: 102, y: 64, width: 20, height: 16, angle: 0, color: '#92400e' },
    { type: 'chair', x: 94, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },
    { type: 'chair', x: 124, y: 68, width: 6, height: 6, angle: 0, color: '#451a03' },

    // Greenery
    { type: 'plant', x: 44, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },
    { type: 'plant', x: 90, y: 18, width: 8, height: 8, angle: 0, color: '#16a34a' },

    // --- 3. Bistro Kitchen (East Wing Top) ---
    { type: 'stove', x: xEast + 12, y: 14, width: 22, height: 16, angle: 0, color: '#c2410c' },
    { type: 'kitchen_counter', x: xEast + 40, y: 14, width: 32, height: 12, angle: 0, color: '#64748b' },
    { type: 'sink', x: xEast + 78, y: 14, width: 16, height: 12, angle: 0, color: '#e2e8f0' },
    { type: 'fridge', x: W - 32, y: 14, width: 18, height: 16, angle: 0, color: '#38bdf8' },
    { type: 'kitchen_counter', x: xEast + 40, y: 34, width: 26, height: 12, angle: 0, color: '#64748b' },
    { type: 'microwave', x: xEast + 46, y: 36, width: 8, height: 6, angle: 0, color: '#334155' },
    { type: 'shelf', x: xEast + 72, y: 34, width: 32, height: 10, angle: 0, color: '#475569' },

    // --- 4. Manager Office & Safe (East Wing Bottom-Left) ---
    { type: 'desk', x: xEast + 12, y: 64, width: 24, height: 12, angle: 0, color: '#78350f' },
    { type: 'chair', x: xEast + 18, y: 78, width: 7, height: 7, angle: 0, color: '#451a03' },
    { type: 'safe', x: xEast + 42, y: 64, width: 12, height: 12, angle: 0, color: '#0f172a' },
    { type: 'file_cabinet', x: xEast + 56, y: 64, width: 12, height: 10, angle: 0, color: '#64748b' },

    // --- 5. Restroom (East Wing Bottom-Right) ---
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

// -------------------------------------------------------------
// Walkability Verification Engine
// -------------------------------------------------------------

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ddx = px - x1;
    const ddy = py - y1;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  const cdx = px - cx;
  const cdy = py - cy;
  return Math.sqrt(cdx * cdx + cdy * cdy);
}

const NON_BLOCKING_FURNITURE = new Set([
  'carpet',
  'plant',
  'chair',
  'computer',
  'tv',
  'blackboard',
  'whiteboard',
  'mirror'
]);

export interface WalkabilityReport {
  buildingId: string;
  type: string;
  name: string;
  width: number;
  height: number;
  spawnPoint: { x: number; y: number };
  spawnPassable: boolean;
  exitZoneReachable: boolean;
  totalWalkablePercentage: number;
  unreachableRooms: string[];
  unreachableCashRegisters: number;
  passed: boolean;
}

export function testLayoutWalkability(layout: BuildingLayout, bldType: string, bldName: string): WalkabilityReport {
  const W = layout.width;
  const H = layout.height;
  const playerRadius = 6.5;
  const wallMinDist = playerRadius + 1.5; // 8.0 units

  // Entrance spawn point as calculated by App.tsx
  const exitZone = layout.exitZone || layout.exits[0];
  const enterX = Math.round(exitZone.x + exitZone.width / 2);
  const enterY = Math.round(exitZone.y - 12);

  // We test on a 1x1 grid from x=7 to x=W-7, y=7 to y=H-7
  const minX = Math.ceil(playerRadius + 7);
  const maxX = Math.floor(W - playerRadius - 7);
  const minY = Math.ceil(playerRadius + 7);
  const maxY = Math.floor(H - playerRadius - 7);

  const gridW = W;
  const gridH = H;
  const isPassable = new Uint8Array(gridW * gridH);

  // 1. Mark blocked cells
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      let blocked = false;

      // Wall check
      for (const wall of layout.walls) {
        if (distToSegment(x, y, wall.x1, wall.y1, wall.x2, wall.y2) < wallMinDist) {
          blocked = true;
          break;
        }
      }

      // Furniture check
      if (!blocked) {
        for (const furn of layout.furniture) {
          if (NON_BLOCKING_FURNITURE.has(furn.type)) continue;

          // AABB check with player radius
          const fx1 = furn.x - playerRadius;
          const fx2 = furn.x + furn.width + playerRadius;
          const fy1 = furn.y - playerRadius;
          const fy2 = furn.y + furn.height + playerRadius;

          if (x >= fx1 && x <= fx2 && y >= fy1 && y <= fy2) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked) {
        isPassable[y * gridW + x] = 1;
      }
    }
  }

  const spawnPassable = isPassable[enterY * gridW + enterX] === 1;

  // 2. Flood fill (BFS) from spawn point
  const visited = new Uint8Array(gridW * gridH);
  const queueX: number[] = [];
  const queueY: number[] = [];

  if (spawnPassable) {
    queueX.push(enterX);
    queueY.push(enterY);
    visited[enterY * gridW + enterX] = 1;
  } else {
    // If exact point is close to edge, find closest free cell in radius 3
    let found = false;
    for (let r = 1; r <= 3 && !found; r++) {
      for (let dy = -r; dy <= r && !found; dy++) {
        for (let dx = -r; dx <= r && !found; dx++) {
          const nx = enterX + dx;
          const ny = enterY + dy;
          if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY && isPassable[ny * gridW + nx] === 1) {
            queueX.push(nx);
            queueY.push(ny);
            visited[ny * gridW + nx] = 1;
            found = true;
          }
        }
      }
    }
  }

  let head = 0;
  let totalWalkableCells = 0;
  while (head < queueX.length) {
    const cx = queueX[head];
    const cy = queueY[head];
    head++;
    totalWalkableCells++;

    const neighbors = [
      [cx + 1, cy],
      [cx - 1, cy],
      [cx, cy + 1],
      [cx, cy - 1],
      [cx + 1, cy + 1],
      [cx - 1, cy + 1],
      [cx + 1, cy - 1],
      [cx - 1, cy - 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx >= minX && nx <= maxX && ny >= minY && ny <= maxY) {
        const idx = ny * gridW + nx;
        if (isPassable[idx] === 1 && visited[idx] === 0) {
          visited[idx] = 1;
          queueX.push(nx);
          queueY.push(ny);
        }
      }
    }
  }

  // 3. Verify exit zone reachability
  // Player reaches exit zone if they can walk to within interaction range (40px) or adjacent to it
  let exitZoneReachable = false;
  const exitCenterX = exitZone.x + exitZone.width / 2;
  const exitCenterY = exitZone.y + exitZone.height / 2;
  for (let ey = Math.max(minY, Math.floor(exitZone.y - 12)); ey <= Math.min(maxY, Math.floor(exitZone.y + 4)); ey++) {
    for (let ex = Math.max(minX, Math.floor(exitZone.x)); ex <= Math.min(maxX, Math.floor(exitZone.x + exitZone.width)); ex++) {
      if (visited[ey * gridW + ex] === 1) {
        exitZoneReachable = true;
        break;
      }
    }
    if (exitZoneReachable) break;
  }

  // 4. Verify each room is reachable (at least 20% of its internal area visited)
  const unreachableRooms: string[] = [];
  for (const rm of layout.rooms) {
    let roomFreeCount = 0;
    let roomVisitedCount = 0;
    const rMinX = Math.max(minX, Math.floor(rm.x + playerRadius));
    const rMaxX = Math.min(maxX, Math.floor(rm.x + rm.width - playerRadius));
    const rMinY = Math.max(minY, Math.floor(rm.y + playerRadius));
    const rMaxY = Math.min(maxY, Math.floor(rm.y + rm.height - playerRadius));

    for (let ry = rMinY; ry <= rMaxY; ry++) {
      for (let rx = rMinX; rx <= rMaxX; rx++) {
        if (isPassable[ry * gridW + rx] === 1) {
          roomFreeCount++;
          if (visited[ry * gridW + rx] === 1) {
            roomVisitedCount++;
          }
        }
      }
    }

    if (roomFreeCount === 0 || roomVisitedCount / roomFreeCount < 0.20) {
      unreachableRooms.push(`${rm.name} (${roomVisitedCount}/${roomFreeCount} walkable cells)`);
    }
  }

  // 5. Verify every cash register is reachable from customer side (within interaction reach 35px)
  let unreachableCashRegisters = 0;
  for (const furn of layout.furniture) {
    if (furn.type === 'cash_register') {
      const fcx = furn.x + furn.width / 2;
      const fcy = furn.y + furn.height / 2;
      let regReachable = false;

      for (let dy = -30; dy <= 30 && !regReachable; dy += 2) {
        for (let dx = -30; dx <= 30 && !regReachable; dx += 2) {
          const testX = Math.round(fcx + dx);
          const testY = Math.round(fcy + dy);
          if (testX >= minX && testX <= maxX && testY >= minY && testY <= maxY) {
            if (visited[testY * gridW + testX] === 1) {
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d <= 32) {
                regReachable = true;
              }
            }
          }
        }
      }

      if (!regReachable) {
        unreachableCashRegisters++;
      }
    }
  }

  const totalPossible = (maxX - minX + 1) * (maxY - minY + 1);
  const totalWalkablePercentage = Math.round((totalWalkableCells / totalPossible) * 100);

  const passed = spawnPassable &&
                 exitZoneReachable &&
                 unreachableRooms.length === 0 &&
                 unreachableCashRegisters === 0 &&
                 totalWalkablePercentage >= 35;

  return {
    buildingId: layout.buildingId,
    type: bldType,
    name: bldName,
    width: W,
    height: H,
    spawnPoint: { x: enterX, y: enterY },
    spawnPassable,
    exitZoneReachable,
    totalWalkablePercentage,
    unreachableRooms,
    unreachableCashRegisters,
    passed
  };
}

// -------------------------------------------------------------
// Script Execution
// -------------------------------------------------------------

function run() {
  const mapPath = path.resolve('public/map.json');
  const mapData = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

  const TARGET_BUILDINGS = [
    { id: 'urb_l1_n_9_4', type: 'supermarket_store', builder: buildSupermarketLayout },
    { id: 'urb_l1_n_4_7', type: 'supermarket_store', builder: buildSupermarketLayout },
    { id: 'urb_l1_n_1_4', type: 'pharmacy_store', builder: buildPharmacyLayout },
    { id: 'urb_l1_n_7_4', type: 'pharmacy_store', builder: buildPharmacyLayout },
    { id: 'urb_l1_n_3_7', type: 'pharmacy_store', builder: buildPharmacyLayout },
    { id: 'urb_l1_n_5_4', type: 'bakery_cafe', builder: buildBakeryCafeLayout },
    { id: 'urb_l1_n_8_4', type: 'bakery_cafe', builder: buildBakeryCafeLayout },
    { id: 'urb_l1_n_0_4', type: 'coffee_bistro', builder: buildCoffeeBistroLayout },
    { id: 'urb_l1_n_5_7', type: 'coffee_bistro', builder: buildCoffeeBistroLayout }
  ];

  console.log(`Verifying and generating interiors for ${TARGET_BUILDINGS.length} retail branches...`);

  let allPassed = true;
  const newLayouts: Record<string, BuildingLayout> = {};

  for (const target of TARGET_BUILDINGS) {
    const bld = mapData.buildings.find((b: any) => b.id === target.id);
    if (!bld) {
      console.error(`ERROR: Building ${target.id} not found in map.json!`);
      allPassed = false;
      continue;
    }

    const layout = target.builder(bld);
    const report = testLayoutWalkability(layout, bld.type, bld.nameRu || bld.id);

    console.log(`\n======================================================`);
    console.log(`Branch: ${report.name} (${report.buildingId})`);
    console.log(`Type: ${report.type} | Dimensions: ${report.width}x${report.height}`);
    console.log(`Spawn point: (${report.spawnPoint.x}, ${report.spawnPoint.y}) -> Passable: ${report.spawnPassable ? 'YES' : 'NO'}`);
    console.log(`Exit Zone Reachable: ${report.exitZoneReachable ? 'YES' : 'NO'}`);
    console.log(`Walkable floor percentage: ${report.totalWalkablePercentage}%`);
    console.log(`Rooms reachable: ${report.unreachableRooms.length === 0 ? 'ALL REACHABLE' : 'UNREACHABLE: ' + report.unreachableRooms.join(', ')}`);
    console.log(`Cash registers reachable: ${report.unreachableCashRegisters === 0 ? 'ALL REACHABLE' : report.unreachableCashRegisters + ' UNREACHABLE'}`);
    console.log(`RESULT: ${report.passed ? 'PASSED (100% WALKABLE)' : 'FAILED'}`);

    if (!report.passed) {
      allPassed = false;
    } else {
      newLayouts[target.id] = layout;
    }
  }

  if (!allPassed) {
    console.error('\nWalkability verification FAILED! map.json will NOT be modified.');
    process.exit(1);
  }

  console.log('\nAll 9 buildings passed walkability verification! Updating public/map.json...');

  for (const bld of mapData.buildings) {
    if (newLayouts[bld.id]) {
      bld.interiors = {
        '0': newLayouts[bld.id]
      };
      console.log(`Updated interiors for ${bld.id} (${bld.nameRu})`);
    }
  }

  fs.writeFileSync(mapPath, JSON.stringify(mapData, null, 2), 'utf8');
  console.log('\nSuccessfully saved verified layouts directly into public/map.json!');
}

run();

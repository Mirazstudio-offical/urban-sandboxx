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
  px = Math.max(radius + 7, Math.min(bld.width - radius - 7, px));
  py = Math.max(radius + 7, Math.min(bld.height - radius - 7, py));

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
      furn.type === 'blackboard'
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
    if (apt.isLocked) {
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
    ctx.fillRect(0, 0, bld.width, bld.height);

    // Sterile institutional floor tiles (single batched stroke for high FPS)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let tx = 0; tx < bld.width; tx += 12) {
      ctx.moveTo(tx, 0); ctx.lineTo(tx, bld.height);
    }
    for (let ty = 0; ty < bld.height; ty += 12) {
      ctx.moveTo(0, ty); ctx.lineTo(bld.width, ty);
    }
    ctx.stroke();

    // Classic Hospital Floor Navigation Guide Lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 116);
    ctx.lineTo(bld.width - 25, 116);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(2, 132, 199, 0.42)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(25, 124);
    ctx.lineTo(bld.width - 25, 124);
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
    ctx.fillRect(0, 0, bld.width, bld.height);
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
  ctx.strokeRect(1, 1, bld.width, bld.height);

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, bld.width, bld.height);

  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, bld.width, bld.height);

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
  for (let x = 30; x < bld.width - 30; x += 40) {
    windows.push({ x, y: 0, side: 'top' });
    windows.push({ x, y: bld.height, side: 'bottom' });
  }
  for (let y = 30; y < bld.height - 30; y += 40) {
    windows.push({ x: 0, y, side: 'left' });
    windows.push({ x: bld.width, y, side: 'right' });
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
  const cacheKey = `${bld.id}_${(bld as any).currentFloor ?? 0}_${bld.width}_${bld.height}_${layout.rooms?.length || 0}_${layout.furniture?.length || 0}_${furnAnglesSum.toFixed(2)}`;
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
    cachedCanvas.width = bld.width;
    cachedCanvas.height = bld.height;
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

import { Building, Player } from './types';
import { sound } from './audio';

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
    | 'jail_cot';
  x: number; // relative X
  y: number; // relative Y
  width: number;
  height: number;
  angle: number;
  color: string;
}

export interface InteriorRoom {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface BuildingLayout {
  buildingId: string;
  floor: number;
  width: number;
  height: number;
  rooms: InteriorRoom[];
  walls: InteriorWall[];
  furniture: InteriorFurniture[];
  elevatorZone: { x: number; y: number; width: number; height: number };
  stairsZone: { x: number; y: number; width: number; height: number };
  exitZone: { x: number; y: number; width: number; height: number };
}

// Deterministic seed-based random generator to ensure layouts are consistent per building/floor
function createSeededRandom(seedString: string) {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) % 4294967296;
    return Math.abs(hash) / 4294967296;
  };
}

export function getBuildingFloorsCount(bld: Building): number {
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
    case 'cultural_center':
      return 2;
    case 'shop':
    case 'car_dealership':
    default:
      return 1;
  }
}

export function generateBuildingLayout(bld: Building, floor: number): BuildingLayout {
  const rand = createSeededRandom(`${bld.id}_floor_${floor}`);
  const W = bld.width;
  const H = bld.height;

  const rooms: InteriorRoom[] = [];
  const walls: InteriorWall[] = [];
  const furniture: InteriorFurniture[] = [];

  // 1. Elevator & Stairs positions
  // Located at the back (opposite to entrance if possible, or centered along the north wall)
  const entSide = bld.entranceSide || 'south';
  let elX = W / 2 - 14;
  let elY = 6;
  let stX = W / 2 + 14;
  let stY = 6;

  if (entSide === 'north') {
    elY = H - 22;
    stY = H - 22;
  } else if (entSide === 'west') {
    elX = W - 22; elY = H / 2 - 14;
    stX = W - 22; stY = H / 2 + 14;
  } else if (entSide === 'east') {
    elX = 6; elY = H / 2 - 14;
    stX = 6; stY = H / 2 + 14;
  }

  const elevatorZone = { x: elX, y: elY, width: 20, height: 16 };
  const stairsZone = { x: stX, y: stY, width: 20, height: 16 };

  // Exit zone at the entrance side
  let exX = W / 2 - 12;
  let exY = H - 8;
  const primaryEnt = (bld.entrances && bld.entrances.length > 0) ? bld.entrances[0] : { side: entSide, offsetRatio: 0.5 };
  if (primaryEnt.side === 'north') {
    exX = W * primaryEnt.offsetRatio - 12; exY = 0;
  } else if (primaryEnt.side === 'south') {
    exX = W * primaryEnt.offsetRatio - 12; exY = H - 8;
  } else if (primaryEnt.side === 'west') {
    exX = 0; exY = H * primaryEnt.offsetRatio - 12;
  } else if (primaryEnt.side === 'east') {
    exX = W - 8; exY = H * primaryEnt.offsetRatio - 12;
  }
  const exitZone = { x: exX, y: exY, width: 24, height: 8 };

  // 2. BUILD ROOMS AND WALLS BASED ON BUILDING TYPE
  const isResidential = ['residential', 'panel_apartment', 'brick_residential', 'modern_residential', 'suburban'].includes(bld.type);
  const isOffice = ['office', 'business_center'].includes(bld.type);
  const isShop = ['shop', 'shopping_mall', 'commercial', 'car_dealership'].includes(bld.type);

  if (isResidential) {
    // Hallway / Corridor
    let hallwayY = H / 2 - 10;
    let hallwayHeight = 20;

    rooms.push({
      name: 'Коридор',
      x: 6,
      y: hallwayY,
      width: W - 12,
      height: hallwayHeight,
      color: '#475569'
    });

    // Elevator/Stairs lobby connector
    rooms.push({
      name: 'Лифтовой Холл',
      x: W / 2 - 26,
      y: 6,
      width: 52,
      height: hallwayY - 6,
      color: '#475569'
    });

    // Exit vestibule connector
    rooms.push({
      name: 'Вестибюль',
      x: W / 2 - 15,
      y: hallwayY + hallwayHeight,
      width: 30,
      height: H - (hallwayY + hallwayHeight) - 6,
      color: '#475569'
    });

    // Hallway walls with doors to upper apartments
    walls.push({ x1: 6, y1: hallwayY, x2: 20, y2: hallwayY });
    walls.push({ x1: 36, y1: hallwayY, x2: W / 2 - 26, y2: hallwayY });

    walls.push({ x1: W / 2 + 26, y1: hallwayY, x2: W - 36, y2: hallwayY });
    walls.push({ x1: W - 20, y1: hallwayY, x2: W - 6, y2: hallwayY });

    // Lower hallway wall with gaps for lobby
    walls.push({ x1: 6, y1: hallwayY + hallwayHeight, x2: W / 2 - 15, y2: hallwayY + hallwayHeight });
    walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight, x2: W - 6, y2: hallwayY + hallwayHeight });

    // Vertical walls separating apartments from elevator lobby
    walls.push({ x1: W / 2 - 26, y1: 6, x2: W / 2 - 26, y2: hallwayY });
    walls.push({ x1: W / 2 + 26, y1: 6, x2: W / 2 + 26, y2: hallwayY });

    // Vertical walls separating apartments from entrance lobby with doors
    walls.push({ x1: W / 2 - 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 - 15, y2: H - 6 });
    walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 + 15, y2: H - 6 });

    // Left Upper Apartment
    const apUW = W / 2 - 32;
    const apUH = hallwayY - 6;
    rooms.push({
      name: `Кв. ${floor * 4 + 1} (Зал)`,
      x: 6,
      y: 6,
      width: apUW,
      height: apUH,
      color: '#1e293b'
    });
    furniture.push({ type: 'bed', x: 12, y: 10, width: 22, height: 26, angle: 0, color: '#f43f5e' });
    furniture.push({ type: 'sofa', x: 10, y: hallwayY - 14, width: 26, height: 10, angle: 0, color: '#38bdf8' });

    // Right Upper Apartment
    rooms.push({
      name: `Кв. ${floor * 4 + 2} (Зал)`,
      x: W / 2 + 26,
      y: 6,
      width: apUW,
      height: apUH,
      color: '#1e293b'
    });
    furniture.push({ type: 'bed', x: W - 34, y: 10, width: 22, height: 26, angle: 0, color: '#f43f5e' });
    furniture.push({ type: 'sofa', x: W - 36, y: hallwayY - 14, width: 26, height: 10, angle: 0, color: '#38bdf8' });

    // Left Lower Apartment
    const apLW = W / 2 - 21;
    const apLH = H - (hallwayY + hallwayHeight) - 6;
    const lowerY = hallwayY + hallwayHeight;
    rooms.push({
      name: `Кв. ${floor * 4 + 3} (Студия)`,
      x: 6,
      y: lowerY,
      width: apLW,
      height: apLH,
      color: '#1e293b'
    });
    furniture.push({ type: 'sofa', x: 10, y: lowerY + 4, width: 26, height: 10, angle: 0, color: '#a855f7' });
    furniture.push({ type: 'table', x: 12, y: H - 18, width: 16, height: 12, angle: 0, color: '#b45309' });

    // Right Lower Apartment
    rooms.push({
      name: `Кв. ${floor * 4 + 4} (Студия)`,
      x: W / 2 + 15,
      y: lowerY,
      width: apLW,
      height: apLH,
      color: '#1e293b'
    });
    furniture.push({ type: 'sofa', x: W - 36, y: lowerY + 4, width: 26, height: 10, angle: 0, color: '#a855f7' });
    furniture.push({ type: 'table', x: W - 28, y: H - 18, width: 16, height: 12, angle: 0, color: '#b45309' });
  } else if (isOffice) {
    // LOBBY on Floor 0, Corridors + Office rooms on higher floors
    if (floor === 0) {
      rooms.push({
        name: 'Главный Вестибюль',
        x: 6,
        y: 6,
        width: W - 12,
        height: H - 12,
        color: '#334155'
      });

      // Big reception desk
      furniture.push({ type: 'desk_reception', x: W / 2 - 24, y: H / 2 - 6, width: 48, height: 10, angle: 0, color: '#f59e0b' });
      // Computers behind desk
      furniture.push({ type: 'computer', x: W / 2 - 12, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });
      furniture.push({ type: 'computer', x: W / 2 + 6, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#1e293b' });

      // Waiting area sofas and plants
      furniture.push({ type: 'sofa', x: 12, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'sofa', x: W - 44, y: H - 24, width: 32, height: 10, angle: 0, color: '#64748b' });
      furniture.push({ type: 'plant', x: 10, y: H - 36, width: 10, height: 10, angle: 0, color: '#15803d' });
      furniture.push({ type: 'plant', x: W - 20, y: H - 36, width: 10, height: 10, angle: 0, color: '#15803d' });
      furniture.push({ type: 'vending_machine', x: 10, y: 16, width: 12, height: 10, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'cooler', x: W - 18, y: 16, width: 8, height: 8, angle: 0, color: '#38bdf8' });
    } else {
      // Upper office floors: central corridor with offices left and right
      const hallwayY = H / 2 - 10;
      const hallwayHeight = 20;

      rooms.push({
        name: 'Коридор',
        x: 6,
        y: hallwayY,
        width: W - 12,
        height: hallwayHeight,
        color: '#475569'
      });

      // Elevator/Stairs lobby connector
      rooms.push({
        name: 'Лифтовой Холл',
        x: W / 2 - 26,
        y: 6,
        width: 52,
        height: hallwayY - 6,
        color: '#475569'
      });

      // Exit vestibule connector
      rooms.push({
        name: 'Вестибюль',
        x: W / 2 - 15,
        y: hallwayY + hallwayHeight,
        width: 30,
        height: H - (hallwayY + hallwayHeight) - 6,
        color: '#475569'
      });

      // Hallway walls with door gaps for upper offices
      walls.push({ x1: 6, y1: hallwayY, x2: 20, y2: hallwayY });
      walls.push({ x1: 36, y1: hallwayY, x2: W / 2 - 26, y2: hallwayY });

      walls.push({ x1: W / 2 + 26, y1: hallwayY, x2: W - 36, y2: hallwayY });
      walls.push({ x1: W - 20, y1: hallwayY, x2: W - 6, y2: hallwayY });

      // Lower hallway wall with gaps for lobby
      walls.push({ x1: 6, y1: hallwayY + hallwayHeight, x2: W / 2 - 15, y2: hallwayY + hallwayHeight });
      walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight, x2: W - 6, y2: hallwayY + hallwayHeight });

      // Vertical walls separating offices from elevator lobby
      walls.push({ x1: W / 2 - 26, y1: 6, x2: W / 2 - 26, y2: hallwayY });
      walls.push({ x1: W / 2 + 26, y1: 6, x2: W / 2 + 26, y2: hallwayY });

      // Vertical walls separating offices from entrance lobby with doors
      walls.push({ x1: W / 2 - 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 - 15, y2: H - 6 });
      walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 + 15, y2: H - 6 });

      // Left Upper Office
      const offW = W / 2 - 32;
      const offH = hallwayY - 6;
      rooms.push({
        name: `Офис ${floor * 10 + 1}`,
        x: 6,
        y: 6,
        width: offW,
        height: offH,
        color: '#1e293b'
      });
      furniture.push({ type: 'desk', x: 12, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: 17, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: 18, y: 8, width: 4, height: 4, angle: 0, color: '#334155' });

      // Right Upper Office
      rooms.push({
        name: `Офис ${floor * 10 + 2}`,
        x: W / 2 + 26,
        y: 6,
        width: offW,
        height: offH,
        color: '#1e293b'
      });
      furniture.push({ type: 'desk', x: W - 28, y: 12, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: W - 23, y: 13, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: W - 22, y: 8, width: 4, height: 4, angle: 0, color: '#334155' });

      // Left Lower Office
      const botY = hallwayY + hallwayHeight;
      const offLH = H - botY - 6;
      const offLW = W / 2 - 21;
      rooms.push({
        name: `Офис ${floor * 10 + 3}`,
        x: 6,
        y: botY,
        width: offLW,
        height: offLH,
        color: '#1e293b'
      });
      furniture.push({ type: 'desk', x: 12, y: H - 22, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: 17, y: H - 21, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: 18, y: H - 10, width: 4, height: 4, angle: 0, color: '#334155' });

      // Right Lower Office
      rooms.push({
        name: `Офис ${floor * 10 + 4}`,
        x: W / 2 + 15,
        y: botY,
        width: offLW,
        height: offLH,
        color: '#1e293b'
      });
      furniture.push({ type: 'desk', x: W - 28, y: H - 22, width: 16, height: 10, angle: 0, color: '#a16207' });
      furniture.push({ type: 'computer', x: W - 23, y: H - 21, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: W - 22, y: H - 10, width: 4, height: 4, angle: 0, color: '#334155' });
    }
  } else if (isShop) {
    // Open market / store layout
    rooms.push({
      name: floor === 0 ? 'Торговый Зал' : 'Выставочный Зал / Склад',
      x: 6,
      y: 6,
      width: W - 12,
      height: H - 12,
      color: '#1e293b'
    });

    // Generate product shelves in rows (vertical or horizontal depending on bld size)
    const shelfRows = W > H ? 3 : 2;
    const shelfSpacing = (W - 32) / shelfRows;

    for (let r = 0; r < shelfRows; r++) {
      const sx = 16 + r * shelfSpacing;
      // Multi-segment shelves
      furniture.push({ type: 'shelf', x: sx, y: 24, width: 10, height: H - 48, angle: 0, color: '#3f3f46' });
    }

    // Checkout / Cash registers at the front (south wall)
    furniture.push({ type: 'counter', x: 12, y: H - 24, width: 24, height: 10, angle: 0, color: '#4b5563' });
    furniture.push({ type: 'computer', x: 18, y: H - 22, width: 6, height: 4, angle: 0, color: '#000000' });

    furniture.push({ type: 'counter', x: W - 36, y: H - 24, width: 24, height: 10, angle: 0, color: '#4b5563' });
    furniture.push({ type: 'computer', x: W - 30, y: H - 22, width: 6, height: 4, angle: 0, color: '#000000' });

    // Entry decoration
    furniture.push({ type: 'plant', x: 8, y: H - 36, width: 8, height: 8, angle: 0, color: '#16a34a' });
    furniture.push({ type: 'plant', x: W - 16, y: H - 36, width: 8, height: 8, angle: 0, color: '#16a34a' });
  } else if (bld.type === 'hospital') {
    // Treatment bays, lobby, waiting chairs
    if (floor === 0) {
      rooms.push({
        name: 'Регистратура и Лобби',
        x: 6,
        y: 6,
        width: W - 12,
        height: H - 12,
        color: '#0f172a'
      });

      furniture.push({ type: 'desk_reception', x: W / 2 - 20, y: H / 2 - 6, width: 40, height: 10, angle: 0, color: '#10b981' });
      furniture.push({ type: 'computer', x: W / 2 - 10, y: H / 2 - 4, width: 6, height: 4, angle: 0, color: '#000000' });

      // Rows of plastic waiting chairs
      for (let i = 0; i < 4; i++) {
        furniture.push({ type: 'chair', x: 12 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
        furniture.push({ type: 'chair', x: W - 40 + i * 8, y: H - 20, width: 6, height: 6, angle: 0, color: '#3b82f6' });
      }
    } else {
      // Patient wards
      const hallwayY = H / 2 - 8;
      const hallwayHeight = 16;
      rooms.push({ name: 'Коридор', x: 6, y: hallwayY, width: W - 12, height: hallwayHeight, color: '#1e293b' });

      // Elevator/Stairs lobby connector
      rooms.push({
        name: 'Лифтовой Холл',
        x: W / 2 - 26,
        y: 6,
        width: 52,
        height: hallwayY - 6,
        color: '#1e293b'
      });

      // Exit vestibule connector
      rooms.push({
        name: 'Вестибюль',
        x: W / 2 - 15,
        y: hallwayY + hallwayHeight,
        width: 30,
        height: H - (hallwayY + hallwayHeight) - 6,
        color: '#1e293b'
      });

      // Hallway walls with door gaps for wards
      walls.push({ x1: 6, y1: hallwayY, x2: 20, y2: hallwayY });
      walls.push({ x1: 36, y1: hallwayY, x2: W / 2 - 26, y2: hallwayY });

      walls.push({ x1: W / 2 + 26, y1: hallwayY, x2: W - 36, y2: hallwayY });
      walls.push({ x1: W - 20, y1: hallwayY, x2: W - 6, y2: hallwayY });

      // Lower hallway wall with gaps for lobby
      walls.push({ x1: 6, y1: hallwayY + hallwayHeight, x2: W / 2 - 15, y2: hallwayY + hallwayHeight });
      walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight, x2: W - 6, y2: hallwayY + hallwayHeight });

      // Vertical walls separating wards from elevator lobby
      walls.push({ x1: W / 2 - 26, y1: 6, x2: W / 2 - 26, y2: hallwayY });
      walls.push({ x1: W / 2 + 26, y1: 6, x2: W / 2 + 26, y2: hallwayY });

      // Vertical walls separating wards from entrance lobby with doors
      walls.push({ x1: W / 2 - 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 - 15, y2: H - 6 });
      walls.push({ x1: W / 2 + 15, y1: hallwayY + hallwayHeight + 16, x2: W / 2 + 15, y2: H - 6 });

      // Left Upper Ward
      const wWidth = W / 2 - 32;
      const wHeight = hallwayY - 6;
      rooms.push({ name: `Палата ${floor * 100 + 1}`, x: 6, y: 6, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: 12, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });

      // Right Upper Ward
      rooms.push({ name: `Палата ${floor * 100 + 2}`, x: W / 2 + 26, y: 6, width: wWidth, height: wHeight, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: W - 26, y: 12, width: 14, height: 22, angle: 0, color: '#f8fafc' });

      // Left Lower Ward
      const lowerY = hallwayY + hallwayHeight;
      const wLH = H - lowerY - 6;
      const wLW = W / 2 - 21;
      rooms.push({ name: `Палата ${floor * 100 + 3}`, x: 6, y: lowerY, width: wLW, height: wLH, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: 12, y: lowerY + 4, width: 14, height: 22, angle: 0, color: '#f8fafc' });

      // Right Lower Ward
      rooms.push({ name: `Палата ${floor * 100 + 4}`, x: W / 2 + 15, y: lowerY, width: wLW, height: wLH, color: '#042f2e' });
      furniture.push({ type: 'bed_hospital', x: W - 26, y: lowerY + 4, width: 14, height: 22, angle: 0, color: '#f8fafc' });
    }
  } else if (bld.type === 'police_station') {
    // Reception, desks, holding cells with bars!
    if (floor === 0) {
      rooms.push({ name: 'Полицейский Участок (Дежурная часть)', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });

      // Jail holding cells on floor 0!
      const cellW = 35;
      const cellH = H - 40;
      rooms.push({ name: 'Камера Временного Содержания', x: W - cellW - 6, y: 6, width: cellW, height: cellH, color: '#0f172a' });
      
      // Cell wall division
      walls.push({ x1: W - cellW - 6, y1: 6, x2: W - cellW - 6, y2: cellH + 6 });
      // Jail bars as visual lines
      walls.push({ x1: W - cellW - 6, y1: 18, x2: W - 6, y2: 18, isJailBars: true });

      furniture.push({ type: 'jail_cot', x: W - cellW + 2, y: 8, width: 10, height: 20, angle: 0, color: '#78350f' });
      furniture.push({ type: 'toilet', x: W - 14, y: cellH - 4, width: 6, height: 6, angle: 0, color: '#ffffff' });

      // Main desk
      furniture.push({ type: 'desk_reception', x: 12, y: H / 2 - 5, width: 32, height: 10, angle: 0, color: '#1d4ed8' });
    } else {
      // Offices
      rooms.push({ name: 'Кабинеты Следователей', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
      furniture.push({ type: 'desk', x: 16, y: 16, width: 18, height: 12, angle: 0, color: '#3b82f6' });
      furniture.push({ type: 'computer', x: 22, y: 18, width: 6, height: 4, angle: 0, color: '#000000' });
      furniture.push({ type: 'chair', x: 23, y: 12, width: 4, height: 4, angle: 0, color: '#334155' });
    }
  } else if (bld.type === 'fire_station') {
    // Dorms, mess hall on F1, firetruck parking bays on F0
    if (floor === 0) {
      rooms.push({ name: 'Пожарное Депо (Гаражный Бокс)', x: 6, y: 6, width: W - 12, height: H - 12, color: '#18181b' });
      
      // Firetruck bay lines drawn on garage floor
      furniture.push({ type: 'fire_rack', x: 12, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });
      furniture.push({ type: 'fire_rack', x: W - 26, y: 16, width: 14, height: 8, angle: 0, color: '#ef4444' });
    } else {
      rooms.push({ name: 'Комната Отдыха Пожарных', x: 6, y: 6, width: W - 12, height: H - 12, color: '#27272a' });
      // Rows of cots/beds for firefighters
      for (let i = 0; i < 3; i++) {
        furniture.push({ type: 'bed', x: 12 + i * 20, y: 12, width: 14, height: 22, angle: 0, color: '#b91c1c' });
      }
      furniture.push({ type: 'table', x: W / 2 - 10, y: H - 24, width: 20, height: 14, angle: 0, color: '#78350f' });
    }
  } else {
    // Default fallback interior layout
    rooms.push({ name: 'Помещение', x: 6, y: 6, width: W - 12, height: H - 12, color: '#1e293b' });
    furniture.push({ type: 'table', x: W / 2 - 10, y: H / 2 - 8, width: 20, height: 16, angle: 0, color: '#a16207' });
    furniture.push({ type: 'chair', x: W / 2 - 8, y: H / 2 - 14, width: 4, height: 4, angle: 0, color: '#451a03' });
  }

  // 3. ADD COARSE WALL COLLISION OUTLINES (BUILDING EDGES AND MAIN INNER DIVIDERS)
  // Outer frame walls
  walls.push({ x1: 6, y1: 6, x2: W - 6, y2: 6 });
  walls.push({ x1: W - 6, y1: 6, x2: W - 6, y2: H - 6 });
  walls.push({ x1: W - 6, y1: H - 6, x2: 6, y2: H - 6 });
  walls.push({ x1: 6, y1: H - 6, x2: 6, y2: 6 });

  return {
    buildingId: bld.id,
    floor,
    width: W,
    height: H,
    rooms,
    walls,
    furniture,
    elevatorZone,
    stairsZone,
    exitZone
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
    // Skip if it's jail bars (we can walk through jail cell doors, but not actual bars)
    // For simplicity, let's collide with all walls in layout
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
    if (furn.type === 'carpet' || furn.type === 'plant' || furn.type === 'chair' || furn.type === 'computer' || furn.type === 'tv') continue;

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

  // Map back to absolute world coordinates
  player.x = bld.x + px;
  player.y = bld.y + py;
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

  // Generate windows along the outer walls
  const windows: { x: number; y: number; side: 'top' | 'bottom' | 'left' | 'right' }[] = [];
  // Windows on top/bottom walls (exclude corners)
  for (let x = 30; x < bld.width - 30; x += 40) {
    windows.push({ x, y: 0, side: 'top' });
    windows.push({ x, y: bld.height, side: 'bottom' });
  }
  // Windows on left/right walls
  for (let y = 30; y < bld.height - 30; y += 40) {
    windows.push({ x: 0, y, side: 'left' });
    windows.push({ x: bld.width, y, side: 'right' });
  }

  // Calculate day and electric intensity
  let dayIntensity = 0;
  if (timeHour >= 5 && timeHour < 19) {
    if (timeHour < 12) {
      dayIntensity = (timeHour - 5) / 7; // 5:00 to 12:00 -> 0 to 1
    } else {
      dayIntensity = (19 - timeHour) / 7; // 12:00 to 19:00 -> 1 to 0
    }
  }

  let electricIntensity = 0;
  if (timeHour >= 17 || timeHour < 7) {
    if (timeHour >= 17 && timeHour < 20) {
      electricIntensity = (timeHour - 17) / 3; // fades in
    } else if (timeHour >= 4 && timeHour < 7) {
      electricIntensity = (7 - timeHour) / 3; // fades out
    } else {
      electricIntensity = 1; // night
    }
  }

  // Background concrete/linoleum base floor of building
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, bld.width, bld.height);

  // Draw rooms with nice floor colors
  for (const rm of layout.rooms) {
    ctx.fillStyle = rm.color;
    ctx.fillRect(rm.x, rm.y, rm.width, rm.height);

    // Floor outline
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.strokeRect(rm.x, rm.y, rm.width, rm.height);

    // Room name labels in small Cyrillic text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.font = 'bold 5px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rm.name, rm.x + rm.width / 2, rm.y + rm.height / 2);
  }

  // Draw elevator zone (Шахта лифта)
  const el = layout.elevatorZone;
  ctx.fillStyle = '#334155';
  ctx.fillRect(el.x, el.y, el.width, el.height);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(el.x, el.y, el.width, el.height);
  
  // Elevator sliding doors line
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(el.x + el.width / 2, el.y);
  ctx.lineTo(el.x + el.width / 2, el.y + el.height);
  ctx.stroke();

  // Elevator LED light status indicators (flashes green inside)
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(el.x + 3, el.y + el.height / 2, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Elevator icon label
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 6px sans-serif';
  ctx.fillText('ЛИФТ', el.x + el.width / 2, el.y + el.height / 2 - 1);

  // Draw stairs zone (Лестница)
  const st = layout.stairsZone;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(st.x, st.y, st.width, st.height);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(st.x, st.y, st.width, st.height);

  // Draw step lines
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const stepCount = 5;
  for (let s = 1; s <= stepCount; s++) {
    const sy = st.y + (st.height / (stepCount + 1)) * s;
    ctx.moveTo(st.x + 1, sy);
    ctx.lineTo(st.x + st.width - 1, sy);
  }
  ctx.stroke();

  // Stair icon label
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 5px sans-serif';
  ctx.fillText('ЛЕСТН.', st.x + st.width / 2, st.y + st.height - 3);

  // Draw exit zone (Выход)
  const ex = layout.exitZone;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.25)'; // Soft green glow for exit door
  ctx.fillRect(ex.x, ex.y, ex.width, ex.height);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1;
  ctx.strokeRect(ex.x, ex.y, ex.width, ex.height);

  // Exit sign
  ctx.fillStyle = '#22c55e';
  ctx.font = 'bold 4px sans-serif';
  ctx.fillText('ВЫХОД', ex.x + ex.width / 2, ex.y + ex.height / 2);

  // --- DAYLIGHT VOLUMETRIC GOD RAYS (PENETRATING WINDOWS) ---
  if (dayIntensity > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    for (const win of windows) {
      let x1 = win.x;
      let y1 = win.y;
      let x2 = win.x;
      let y2 = win.y;
      
      const beamLength = 55; // length of light penetration
      const beamSpread = 16; // width at the end
      
      let p1x = 0, p1y = 0, p2x = 0, p2y = 0, p3x = 0, p3y = 0, p4x = 0, p4y = 0;
      
      if (win.side === 'top') {
        y2 = win.y + beamLength;
        x2 = win.x + 15; // Sunlight enters at an angle
        p1x = win.x - 6; p1y = win.y;
        p2x = win.x + 6; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'bottom') {
        y2 = win.y - beamLength;
        x2 = win.x - 15;
        p1x = win.x - 6; p1y = win.y;
        p2x = win.x + 6; p2y = win.y;
        p3x = x2 + beamSpread; p3y = y2;
        p4x = x2 - beamSpread; p4y = y2;
      } else if (win.side === 'left') {
        x2 = win.x + beamLength;
        y2 = win.y + 15;
        p1x = win.x; p1y = win.y - 6;
        p2x = win.x; p2y = win.y + 6;
        p3x = x2; p3y = y2 + beamSpread;
        p4x = x2; p4y = y2 - beamSpread;
      } else if (win.side === 'right') {
        x2 = win.x - beamLength;
        y2 = win.y - 15;
        p1x = win.x; p1y = win.y - 6;
        p2x = win.x; p2y = win.y + 6;
        p3x = x2; p3y = y2 + beamSpread;
        p4x = x2; p4y = y2 - beamSpread;
      }
      
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, `rgba(254, 240, 138, ${0.35 * dayIntensity})`); // Bright daylight gold
      grad.addColorStop(0.3, `rgba(254, 240, 138, ${0.16 * dayIntensity})`);
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

  // --- AMBIENT DARKNESS (NIGHT TIME RECREATION) ---
  const ambientDarkness = 0.58 * (1 - dayIntensity);
  if (ambientDarkness > 0) {
    ctx.fillStyle = `rgba(15, 23, 42, ${ambientDarkness})`;
    ctx.fillRect(4, 4, bld.width - 8, bld.height - 8);
  }

  // Draw furniture
  for (const f of layout.furniture) {
    ctx.save();
    ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
    ctx.rotate(f.angle);
    const halfW = f.width / 2;
    const halfH = f.height / 2;

    switch (f.type) {
      case 'bed':
        // Bed base
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Mattress
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        // Pillows
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-halfW + 3, -halfH + 3, 6, 4);
        ctx.fillRect(halfW - 9, -halfH + 3, 6, 4);
        // Blanket folded
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-halfW + 1, halfH - 12, f.width - 2, 11);
        break;

      case 'sofa':
        // Main sofa seat
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Armrests
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-halfW, -halfH, 3, f.height);
        ctx.fillRect(halfW - 3, -halfH, 3, f.height);
        // Backrest
        ctx.fillRect(-halfW, -halfH, f.width, 3);
        break;

      case 'tv_cabinet':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'tv':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Glowing cyan screen at night
        const hour = timeHour;
        if (hour >= 18 || hour < 6) {
          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(-halfW + 1, halfH - 1, f.width - 2, 1);
        }
        break;

      case 'table':
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-halfW + 2, -halfH + 2, f.width, f.height);
        // Tabletop
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'chair':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'plant':
        // Pot
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        // Green leaves
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(-1, -1, 3.5, 0, Math.PI * 2);
        ctx.arc(1.5, -0.5, 3.2, 0, Math.PI * 2);
        ctx.arc(0, 1.8, 3.0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'carpet':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 0.6;
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'desk':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'computer':
        ctx.fillStyle = '#475569'; // keyboard
        ctx.fillRect(-4, 1, 8, 2);
        // Base screen
        ctx.fillStyle = '#090d16'; // screen housing
        ctx.fillRect(-halfW, -halfH, f.width, 2);
        // Glowing cyan monitor screen
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-halfW + 1, -halfH + 0.5, f.width - 2, 1);
        break;

      case 'cooler':
        // Water bottle (blue)
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(0, -1, 3, 0, Math.PI * 2);
        ctx.fill();
        // Base (white/grey)
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-halfW, 0, f.width, halfH);
        break;

      case 'toilet':
        ctx.fillStyle = '#f1f5f9';
        // Tank
        ctx.fillRect(-halfW, -halfH, f.width, 3);
        // Bowl
        ctx.beginPath();
        ctx.ellipse(0, 1, 3, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bath':
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Inner tub
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfW + 2, -halfH + 2, f.width - 4, f.height - 4);
        break;

      case 'bed_hospital':
        ctx.fillStyle = '#cbd5e1'; // metal frame
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#ffffff'; // white sheet
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.fillStyle = '#93c5fd'; // hospital blue blanket
        ctx.fillRect(-halfW + 1, halfH - 12, f.width - 2, 11);
        ctx.fillStyle = '#f8fafc'; // pillow
        ctx.fillRect(-halfW + 2, -halfH + 2, f.width - 4, 4);
        break;

      case 'desk_reception':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.strokeStyle = '#451a03';
        ctx.strokeRect(-halfW, -halfH, f.width, f.height);
        break;

      case 'sink':
        ctx.fillStyle = '#94a3b8'; // stainless steel or porcelain
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        ctx.fillStyle = '#38bdf8'; // water tap dot
        ctx.fillRect(0, -halfH + 1, 1, 2);
        break;

      case 'vending_machine':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Glowing item rows
        ctx.fillStyle = '#34d399';
        ctx.fillRect(-halfW + 2, -halfH + 3, 3, 2);
        ctx.fillStyle = '#fb923c';
        ctx.fillRect(halfW - 5, -halfH + 3, 3, 2);
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(-halfW + 2, 0, 3, 2);
        break;

      case 'fire_rack':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        // Rolled hoses (white/orange details)
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(-halfW + 4, 0, 2.5, 0, Math.PI * 2);
        ctx.arc(halfW - 4, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'jail_cot':
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        ctx.fillStyle = '#475569'; // flat canvas cot
        ctx.fillRect(-halfW + 1, -halfH + 1, f.width - 2, f.height - 2);
        break;

      default:
        ctx.fillStyle = f.color;
        ctx.fillRect(-halfW, -halfH, f.width, f.height);
        break;
    }

    ctx.restore();
  }

  // Draw interior walls
  ctx.strokeStyle = '#f1f5f9'; // High-contrast clean white/grey walls
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const wall of layout.walls) {
    if (wall.isJailBars) {
      // Draw prison cell bars
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.0;
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

  // --- OUTER WALLS & WINDOW GLASS ---
  // Draw thick outer walls border
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(0, 0, bld.width, bld.height);

  // Draw window glass sills on top of outer walls
  ctx.strokeStyle = '#60a5fa'; // High-contrast cyan glass line
  ctx.lineWidth = 2.2;
  for (const win of windows) {
    ctx.beginPath();
    if (win.side === 'top' || win.side === 'bottom') {
      ctx.moveTo(win.x - 7, win.y);
      ctx.lineTo(win.x + 7, win.y);
    } else {
      ctx.moveTo(win.x, win.y - 7);
      ctx.lineTo(win.x, win.y + 7);
    }
    ctx.stroke();
  }

  // --- ELECTRIC CEILING LIGHTS (EVENING & NIGHT GLOW) ---
  if (electricIntensity > 0) {
    const lights: { x: number; y: number; radius: number }[] = [];
    
    // Create logical lamp points inside rooms
    for (const rm of layout.rooms) {
      const rx = rm.x;
      const ry = rm.y;
      const rw = rm.width;
      const rh = rm.height;
      
      if (rw > 70) {
        lights.push({ x: rx + rw * 0.3, y: ry + rh / 2, radius: Math.min(rw * 0.45, 45) });
        lights.push({ x: rx + rw * 0.7, y: ry + rh / 2, radius: Math.min(rw * 0.45, 45) });
      } else {
        lights.push({ x: rx + rw / 2, y: ry + rh / 2, radius: Math.min(rw * 0.75, 40) });
      }
    }

    // Add lighting in elevator and stairs zones as well
    lights.push({ x: layout.elevatorZone.x + layout.elevatorZone.width / 2, y: layout.elevatorZone.y + layout.elevatorZone.height / 2, radius: 25 });
    lights.push({ x: layout.stairsZone.x + layout.stairsZone.width / 2, y: layout.stairsZone.y + layout.stairsZone.height / 2, radius: 25 });

    // Draw glowing radial electric circles
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const lt of lights) {
      const grad = ctx.createRadialGradient(lt.x, lt.y, 1.5, lt.x, lt.y, lt.radius);
      grad.addColorStop(0, `rgba(253, 224, 71, ${0.46 * electricIntensity})`); // Beautiful soft warm yellow electric glow
      grad.addColorStop(0.35, `rgba(253, 224, 71, ${0.18 * electricIntensity})`);
      grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, lt.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw ceiling lamp fixtures
    for (const lt of lights) {
      // Bulb core
      ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * electricIntensity})`;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, 2.0, 0, Math.PI * 2);
      ctx.fill();
      
      // Brass fixture border
      ctx.strokeStyle = `rgba(234, 179, 8, ${0.85 * electricIntensity})`;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(lt.x, lt.y, 2.0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Draw the player pedestrian specifically inside the building context (relative position)
export function renderPlayerInsideBuilding(
  ctx: CanvasRenderingContext2D,
  player: Player,
  bld: Building
) {
  ctx.save();
  // Player is drawn at world position, but we already have absolute coords.
  // The renderer renders everything in world coords, and inside the layout we map to world.
  // So the player is naturally drawn at player.x, player.y.
  // Let's draw player with a simple, highly detailed walking animation:
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  // Simple clean character circle
  // Legs walking cycle
  const speed = player.speed || 0;
  const walkCycle = player.walkCycle || 0;
  const legOffset = Math.sin(walkCycle) * 3;
  ctx.fillStyle = player.pantsColor;
  ctx.fillRect(-3.5, legOffset - 2, 2.5, 4);
  ctx.fillRect(1.0, -legOffset - 2, 2.5, 4);

  // Hair shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.arc(0.5, 1, 4, 0, Math.PI * 2);
  ctx.fill();

  // Shirt / Body torso
  ctx.fillStyle = player.shirtColor;
  ctx.beginPath();
  ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = player.skinColor;
  ctx.beginPath();
  ctx.arc(0, -0.6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = player.hairColor;
  ctx.beginPath();
  ctx.arc(0, -1.2, 2.3, Math.PI, 0); // half circle back of head
  ctx.fill();

  ctx.restore();
}
